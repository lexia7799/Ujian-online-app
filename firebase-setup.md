# Firebase Setup Instructions

## 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing project: `ujian-online-15771`
3. Enable Authentication and Firestore Database

## 2. Firestore Database Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to artifacts collection
    match /artifacts/{artifactId}/public/data/{document=**} {
      allow read, write: if true;
    }
    
    // Teachers collection
    match /artifacts/{artifactId}/public/data/teachers/{teacherId} {
      allow read, write: if true;
    }
    
    // Students collection  
    match /artifacts/{artifactId}/public/data/students/{studentId} {
      allow read, write: if true;
    }
    
    // Exams collection
    match /artifacts/{artifactId}/public/data/exams/{examId} {
      allow read, write: if true;
      
      // Questions subcollection
      match /questions/{questionId} {
        allow read, write: if true;
      }
      
      // Sessions subcollection
      match /sessions/{sessionId} {
        allow read, write: if true;
      }
      
      // Applications subcollection
      match /applications/{applicationId} {
        allow read, write: if true;
      }
    }
  }
}
```

## 3. Authentication Setup

Enable the following sign-in methods in Firebase Console:
- Email/Password
- Anonymous (for fallback)

## 4. Initial Data Structure

Create these collections in Firestore:

### Collection: `artifacts/ujian-online-app/public/data/teachers`
```json
// Document ID: auto-generated
{
  "username": "string",
  "email": "string", 
  "createdAt": "timestamp",
  "role": "teacher"
}
```

### Collection: `artifacts/ujian-online-app/public/data/students`
```json
// Document ID: auto-generated
{
  "fullName": "string",
  "email": "string",
  "major": "string", 
  "className": "string",
  "university": "string",
  "profilePhoto": "string",
  "createdAt": "timestamp",
  "role": "student"
}
```

### Collection: `artifacts/ujian-online-app/public/data/exams`
```json
// Document ID: auto-generated
{
  "teacherId": "string",
  "name": "string",
  "startTime": "string",
  "endTime": "string", 
  "code": "string",
  "password": "string",
  "status": "draft|published",
  "createdAt": "timestamp"
}
```

### Subcollection: `exams/{examId}/questions`
```json
// Document ID: auto-generated
{
  "text": "string",
  "type": "mc|essay",
  "options": ["string"], // for MC questions
  "correctAnswer": "number" // for MC questions
}
```

### Subcollection: `exams/{examId}/applications`
```json
// Document ID: auto-generated
{
  "studentId": "string",
  "studentData": {
    "fullName": "string",
    "email": "string", 
    "major": "string",
    "className": "string",
    "university": "string",
    "profilePhoto": "string"
  },
  "examId": "string",
  "examName": "string",
  "status": "pending|approved|rejected",
  "appliedAt": "timestamp"
}
```

### Subcollection: `exams/{examId}/sessions`
```json
// Document ID: auto-generated
{
  "studentInfo": {
    "name": "string",
    "nim": "string",
    "major": "string", 
    "className": "string"
  },
  "startTime": "timestamp",
  "finishTime": "timestamp",
  "status": "started|finished|disqualified",
  "violations": "number",
  "answers": "object",
  "finalScore": "number",
  "essayScores": "object",
  "lastViolation": {
    "reason": "string",
    "timestamp": "timestamp",
    "hasSnapshot": "boolean"
  },
  "violationSnapshot_1": {
    "imageData": "string",
    "timestamp": "string", 
    "violationType": "string"
  }
  // violationSnapshot_2, violationSnapshot_3 as needed
}
```

## 5. Security Indexes

Create these composite indexes in Firestore:

**CRITICAL: Collection Group Indexes Required**

The following indexes are REQUIRED for the StudentDashboard to work properly:

1. **Collection Group Index for Sessions**
   - **Collection ID**: `sessions` (Collection Group)
   - **Fields**: 
     - `studentId` (Ascending)
     - `startTime` (Descending) 
     - `__name__` (Ascending)
   - **Direct Link**: Use the error link in browser console to create automatically
   - **Manual Creation**: Firebase Console → Firestore → Indexes → Create Index → Collection Group

2. **Collection Group Index for Applications**
   - **Collection ID**: `applications` (Collection Group)
   - **Fields**:
     - `studentId` (Ascending)
     - `__name__` (Ascending)
   - **Manual Creation**: Firebase Console → Firestore → Indexes → Create Index → Collection Group

**Other Composite Indexes:**

1. **Collection**: `artifacts/ujian-online-app/public/data/exams`
   - Fields: `code` (Ascending), `__name__` (Ascending)

2. **Collection**: `artifacts/ujian-online-app/public/data/exams/{examId}/applications`  
   - Fields: `studentId` (Ascending), `__name__` (Ascending)

3. **Collection**: `artifacts/ujian-online-app/public/data/exams/{examId}/sessions`
   - Fields: `studentInfo.name` (Ascending), `status` (Ascending)

**How to Create Collection Group Indexes:**

1. **Automatic Creation (Recommended)**:
   - Run the app and trigger the error
   - Click the direct link in the browser console error message
   - Firebase will automatically create the required index

2. **Manual Creation**:
   - Go to Firebase Console → Firestore Database → Indexes
   - Click "Create Index"
   - Select "Collection Group" 
   - Enter collection ID: `sessions` or `applications`
   - Add the required fields as listed above
   - Click "Create"

3. **Index Building Time**:
   - Small databases: 1-5 minutes
   - Large databases: Can take hours
   - App will use fallback queries until indexes are ready

## 6. Storage Rules (for violation photos)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /violations/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## 7. Test Data

You can add some test data:

### Test Teacher
```json
// In teachers collection
{
  "username": "dosen_test",
  "email": "dosen@test.com", 
  "createdAt": "2024-01-01T00:00:00Z",
  "role": "teacher"
}
```

### Test Student  
```json
// In students collection
{
  "fullName": "Siswa Test",
  "email": "siswa@test.com",
  "major": "Teknik Informatika",
  "className": "TI-2021-A", 
  "university": "Universitas Test",
  "profilePhoto": "https://via.placeholder.com/150",
  "createdAt": "2024-01-01T00:00:00Z",
  "role": "student"
}
```

## 8. Environment Variables

Make sure your `.env` file has:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=ujian-online-15771
```