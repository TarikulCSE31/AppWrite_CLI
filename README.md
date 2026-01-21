# Google ID Token -> Appwrite JWT

This Appwrite Function exchanges a Google ID token for an Appwrite JWT.

## Env vars

- `APPWRITE_ENDPOINT` (e.g. `https://sgp.cloud.appwrite.io/v1`)
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY` (must have **Users** permissions)
- `GOOGLE_CLIENT_ID` (Web OAuth client ID)

## Function settings

- Runtime: **Node.js 18**
- Execute access: **Any** (guests), so unauthenticated clients can call it

## Request

POST JSON body:

```json
{
  "idToken": "<GOOGLE_ID_TOKEN>"
}
```

## Response

```json
{
  "token": "<APPWRITE_JWT>",
  "userId": "<APPWRITE_USER_ID>",
  "email": "user@example.com",
  "name": "User Name"
}
```

## Android usage (outline)

1. Sign in with Google on device and obtain `idToken`.
2. Call the Appwrite Function (Execution) with `{ "idToken": "..." }`.
3. Set the returned JWT on the Appwrite client: `client.setJWT(token)`.
