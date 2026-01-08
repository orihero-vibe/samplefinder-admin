# Trivia API Documentation

This document describes the Trivia endpoints available in the Mobile API Appwrite function.

## Base URL

```
https://nyc.cloud.appwrite.io/v1/functions/69308117000e7a96bcbb/executions
```

## Authentication

All requests require the Appwrite session or JWT token for authentication.

---

## Endpoints

### 1. Get Active Trivia

Retrieves all currently active trivia questions that the user has not yet answered.

#### Endpoint

```
POST /get-active-trivia
```

#### Request Body

| Field    | Type   | Required | Description                                                   |
| -------- | ------ | -------- | ------------------------------------------------------------- |
| `userId` | string | Yes      | The user's profile document ID from the `user_profiles` table |

#### Example Request

```json
{
  "userId": "user_profile_id_here"
}
```

#### Success Response (200)

```json
{
  "success": true,
  "trivia": [
    {
      "$id": "trivia_document_id",
      "question": "What year was Appwrite founded?",
      "answers": ["2019", "2020", "2021", "2018"],
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-01-31T23:59:59.000Z",
      "points": 100,
      "client": {
        "$id": "client_id",
        "name": "Brand Name",
        "logoURL": "https://example.com/logo.png"
      }
    }
  ],
  "count": 1
}
```

#### Response Fields

| Field     | Type    | Description                                  |
| --------- | ------- | -------------------------------------------- |
| `success` | boolean | Indicates if the request was successful      |
| `trivia`  | array   | Array of active, unanswered trivia questions |
| `count`   | number  | Total count of returned trivia questions     |

#### Trivia Object Fields

| Field       | Type           | Description                              |
| ----------- | -------------- | ---------------------------------------- |
| `$id`       | string         | Unique trivia document ID                |
| `question`  | string         | The trivia question text                 |
| `answers`   | string[]       | Array of possible answers                |
| `startDate` | string         | ISO 8601 date when trivia becomes active |
| `endDate`   | string         | ISO 8601 date when trivia expires        |
| `points`    | number         | Points awarded for correct answer        |
| `client`    | object \| null | Associated brand/client information      |

> **Note:** The `correctOptionIndex` is intentionally excluded from the response for security.

#### Error Responses

| Status | Error                        | Description                    |
| ------ | ---------------------------- | ------------------------------ |
| 400    | `userId is required`         | Missing userId in request body |
| 500    | `Server configuration error` | API key or server issue        |

---

### 2. Submit Trivia Answer

Submit an answer for a trivia question. Records the response and awards points if correct.

#### Endpoint

```
POST /submit-answer
```

#### Request Body

| Field         | Type   | Required | Description                             |
| ------------- | ------ | -------- | --------------------------------------- |
| `userId`      | string | Yes      | The user's profile document ID          |
| `triviaId`    | string | Yes      | The trivia document ID to answer        |
| `answerIndex` | number | Yes      | Zero-based index of the selected answer |

#### Example Request

```json
{
  "userId": "user_profile_id_here",
  "triviaId": "trivia_document_id_here",
  "answerIndex": 0
}
```

#### Success Response - Correct Answer (200)

```json
{
  "success": true,
  "isCorrect": true,
  "pointsAwarded": 100,
  "message": "Correct! You earned 100 points."
}
```

#### Success Response - Incorrect Answer (200)

```json
{
  "success": true,
  "isCorrect": false,
  "pointsAwarded": 0,
  "message": "Incorrect answer. Better luck next time!"
}
```

#### Response Fields

| Field           | Type    | Description                                         |
| --------------- | ------- | --------------------------------------------------- |
| `success`       | boolean | Indicates if the request was processed successfully |
| `isCorrect`     | boolean | Whether the submitted answer was correct            |
| `pointsAwarded` | number  | Points added to user's total (0 if incorrect)       |
| `message`       | string  | Human-readable result message                       |

#### Error Responses

| Status | Error                                            | Description                         |
| ------ | ------------------------------------------------ | ----------------------------------- |
| 400    | `userId is required`                             | Missing userId in request body      |
| 400    | `triviaId is required`                           | Missing triviaId in request body    |
| 400    | `answerIndex is required`                        | Missing answerIndex in request body |
| 400    | `answerIndex must be a non-negative number`      | Invalid answerIndex value           |
| 400    | `Invalid answer index. Must be between 0 and N`  | answerIndex out of bounds           |
| 400    | `This trivia question is not currently active`   | Trivia has expired or not started   |
| 400    | `You have already answered this trivia question` | User already submitted an answer    |
| 404    | `Trivia question not found`                      | Invalid triviaId                    |
| 404    | `User not found`                                 | Invalid userId                      |

---

## Usage Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      TRIVIA FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. User opens trivia section in app
         │
         ▼
┌─────────────────────────────────────┐
│  POST /get-active-trivia            │
│  { "userId": "xxx" }                │
└─────────────────────────────────────┘
         │
         ▼
   ┌─────────────┐
   │ Has trivia? │
   └─────────────┘
      │       │
     Yes      No
      │       │
      ▼       └──► Show "No active trivia" message
┌─────────────────────────────────────┐
│  Display question and answers       │
│  (user selects an answer)           │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  POST /submit-answer                │
│  {                                  │
│    "userId": "xxx",                 │
│    "triviaId": "yyy",               │
│    "answerIndex": 2                 │
│  }                                  │
└─────────────────────────────────────┘
         │
         ▼
   ┌─────────────┐
   │ isCorrect?  │
   └─────────────┘
      │       │
    true    false
      │       │
      ▼       ▼
  Show      Show
  success   failure
  + points  message
```

---

## Code Examples

### React Native (using Appwrite SDK)

First, install the React Native Appwrite SDK:

```bash
npm install react-native-appwrite
# or
yarn add react-native-appwrite
```

#### Setup Client

```typescript
import { Client, Functions, ExecutionMethod } from 'react-native-appwrite';

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('691d4a54003b21bf0136');

const functions = new Functions(client);
```

#### Get Active Trivia

```typescript
async function getActiveTrivia(userId: string) {
  const execution = await functions.createExecution({
    functionId: '69308117000e7a96bcbb',
    body: JSON.stringify({ userId }),
    async: false,
    path: '/get-active-trivia',
    method: ExecutionMethod.POST,
  });

  return JSON.parse(execution.responseBody);
}

// Usage
const result = await getActiveTrivia('user_profile_id');
console.log(result.trivia); // Array of active trivia questions
```

#### Submit Trivia Answer

```typescript
async function submitTriviaAnswer(
  userId: string,
  triviaId: string,
  answerIndex: number
) {
  const execution = await functions.createExecution({
    functionId: '69308117000e7a96bcbb',
    body: JSON.stringify({ userId, triviaId, answerIndex }),
    async: false,
    path: '/submit-answer',
    method: ExecutionMethod.POST,
  });

  return JSON.parse(execution.responseBody);
}

// Usage
const result = await submitTriviaAnswer(
  'user_profile_id',
  'trivia_document_id',
  2 // index of selected answer
);

if (result.isCorrect) {
  console.log(`Correct! You earned ${result.pointsAwarded} points`);
} else {
  console.log('Incorrect answer. Better luck next time!');
}
```

#### Complete React Native Hook Example

```typescript
import { useState, useEffect } from 'react';
import { Client, Functions, ExecutionMethod } from 'react-native-appwrite';

const client = new Client()
  .setEndpoint('https://nyc.cloud.appwrite.io/v1')
  .setProject('691d4a54003b21bf0136');

const functions = new Functions(client);

const FUNCTION_ID = '69308117000e7a96bcbb';

// Types
interface TriviaQuestion {
  $id: string;
  question: string;
  answers: string[];
  startDate: string;
  endDate: string;
  points: number;
  client?: {
    $id: string;
    name: string;
    logoURL?: string;
  };
}

interface SubmitAnswerResult {
  success: boolean;
  isCorrect: boolean;
  pointsAwarded: number;
  message: string;
}

// Custom Hook
export function useTrivia(userId: string) {
  const [trivia, setTrivia] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTrivia = async () => {
    setLoading(true);
    setError(null);

    try {
      const execution = await functions.createExecution({
        functionId: FUNCTION_ID,
        body: JSON.stringify({ userId }),
        async: false,
        path: '/get-active-trivia',
        method: ExecutionMethod.POST,
      });

      const result = JSON.parse(execution.responseBody);

      if (result.success) {
        setTrivia(result.trivia);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trivia');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (
    triviaId: string,
    answerIndex: number
  ): Promise<SubmitAnswerResult | null> => {
    try {
      const execution = await functions.createExecution({
        functionId: FUNCTION_ID,
        body: JSON.stringify({ userId, triviaId, answerIndex }),
        async: false,
        path: '/submit-answer',
        method: ExecutionMethod.POST,
      });

      const result = JSON.parse(execution.responseBody);

      if (result.success) {
        // Remove answered trivia from list
        setTrivia((prev) => prev.filter((t) => t.$id !== triviaId));
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
      return null;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchActiveTrivia();
    }
  }, [userId]);

  return {
    trivia,
    loading,
    error,
    submitAnswer,
    refreshTrivia: fetchActiveTrivia,
  };
}
```

#### Usage in React Native Component

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTrivia } from './hooks/useTrivia';

function TriviaScreen({ userId }: { userId: string }) {
  const { trivia, loading, error, submitAnswer } = useTrivia(userId);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  if (trivia.length === 0) {
    return <Text>No active trivia questions available</Text>;
  }

  const currentTrivia = trivia[0];

  const handleAnswer = async (answerIndex: number) => {
    const result = await submitAnswer(currentTrivia.$id, answerIndex);

    if (result) {
      if (result.isCorrect) {
        alert(`Correct! +${result.pointsAwarded} points`);
      } else {
        alert('Incorrect! Try the next one.');
      }
    }
  };

  return (
    <View>
      <Text>{currentTrivia.question}</Text>
      <Text>Points: {currentTrivia.points}</Text>

      {currentTrivia.answers.map((answer, index) => (
        <TouchableOpacity key={index} onPress={() => handleAnswer(index)}>
          <Text>{answer}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## Database Tables

### trivia

| Column               | Type         | Description                       |
| -------------------- | ------------ | --------------------------------- |
| `$id`                | string       | Document ID                       |
| `question`           | string       | Trivia question text              |
| `answers`            | string[]     | Array of possible answers         |
| `correctOptionIndex` | integer      | Index of correct answer (0-based) |
| `startDate`          | datetime     | When trivia becomes active        |
| `endDate`            | datetime     | When trivia expires               |
| `points`             | integer      | Points awarded for correct answer |
| `client`             | relationship | Link to clients table             |

### trivia_responses

| Column        | Type         | Description                 |
| ------------- | ------------ | --------------------------- |
| `$id`         | string       | Document ID                 |
| `trivia`      | relationship | Link to trivia table        |
| `user`        | relationship | Link to user_profiles table |
| `answer`      | string       | The answer text submitted   |
| `answerIndex` | integer      | Index of submitted answer   |

### user_profiles (relevant fields)

| Column        | Type    | Description                  |
| ------------- | ------- | ---------------------------- |
| `$id`         | string  | Document ID (used as userId) |
| `totalPoints` | integer | User's accumulated points    |
