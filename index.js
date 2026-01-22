const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { Client, Users, ID, Query } = require("node-appwrite");

module.exports = async ({ req, res, log, error }) => {
  try {
    if (req.method !== "POST") {
      return res.json(
        { error: "Method not allowed. Use POST." },
        405
      );
    }

    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    const missing = [
      !endpoint && "APPWRITE_ENDPOINT",
      !projectId && "APPWRITE_PROJECT_ID",
      !apiKey && "APPWRITE_API_KEY",
      !googleClientId && "GOOGLE_CLIENT_ID"
    ].filter(Boolean);

    if (missing.length > 0) {
      const maskedApiKey = apiKey
        ? `${apiKey.slice(0, 6)}...${apiKey.slice(-6)}`
        : "";
      const currentValues = {
        APPWRITE_ENDPOINT: endpoint || "",
        APPWRITE_PROJECT_ID: projectId || "",
        APPWRITE_API_KEY: maskedApiKey,
        GOOGLE_CLIENT_ID: googleClientId || ""
      };
      log(
        `Missing env vars: ${missing.join(", ")}. ` +
          `Current values: ${JSON.stringify(currentValues)}`
      );
      return res.json(
        {
          error:
            "Missing env vars. Required: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, GOOGLE_CLIENT_ID.",
          currentValues
        },
        500
      );
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.json({ error: "Invalid JSON body." }, 400);
      }
    }

    const idToken = body?.idToken || body?.googleIdToken;
    if (!idToken) {
      return res.json({ error: "Missing idToken." }, 400);
    }

    const oauthClient = new OAuth2Client(googleClientId);
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.json({ error: "Google token missing email." }, 400);
    }
    if (payload.email_verified === false) {
      return res.json({ error: "Email not verified." }, 400);
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const users = new Users(client);
    const email = payload.email;
    const name = payload.name || payload.email;

    let userId;
    const existing = await users.list([Query.equal("email", email)]);
    if (existing.total > 0) {
      userId = existing.users[0].$id;
    } else {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const created = await users.create(ID.unique(), email, randomPassword, name);
      userId = created.$id;
    }

    const jwt = await createJwt(endpoint, projectId, apiKey, userId);

    return res.json({
      token: jwt.jwt,
      userId,
      email,
      name
    });
  } catch (e) {
    error(e);
    return res.json(
      { error: e?.message || "Unknown error" },
      500
    );
  }
};

async function createJwt(endpoint, projectId, apiKey, userId) {
  const baseUrl = endpoint.replace(/\/$/, "");
  const url = `${baseUrl}/users/${userId}/jwt`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: "{}"
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.message || `Appwrite error ${response.status}`;
    throw new Error(message);
  }

  return data;
}
