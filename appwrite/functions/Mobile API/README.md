# ⚡ Node.js Starter Function

A simple starter function. Edit `src/main.js` to get started and create something awesome! 🚀

## 🧰 Usage

### GET /ping

- Returns a "Pong" message.

**Response**

Sample `200` Response:

```text
Pong
```

### GET, POST, PUT, PATCH, DELETE /

- Returns a "Learn More" JSON response.

**Response**

Sample `200` Response:

```json
{
  "motto": "Build like a team of hundreds_",
  "learn": "https://appwrite.io/docs",
  "connect": "https://appwrite.io/discord",
  "getInspired": "https://builtwith.appwrite.io"
}
```

## ⚙️ Configuration

| Setting           | Value                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| Runtime           | Node (18.0)                                                                            |
| Entrypoint        | `src/main.js`                                                                          |
| Build Commands    | `npm install`                                                                          |
| Permissions       | `any`                                                                                  |
| Timeout (Seconds) | 15                                                                                     |
| Endpoints         | `/ping`, `/get-events-by-location`, `/get-active-trivia`, `/submit-answer`, `/delete-account` |

## 🔒 Environment Variables

The following environment variables are automatically provided by Appwrite:

- `APPWRITE_FUNCTION_API_ENDPOINT` - Appwrite API endpoint
- `APPWRITE_FUNCTION_PROJECT_ID` - Project ID
- `APPWRITE_FUNCTION_KEY` - API key with admin privileges (required for user deletion)

No additional configuration required.
