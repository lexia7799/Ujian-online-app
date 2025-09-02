@@ .. @@
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setError('');
     setIsLoading(true);

     try {
-      // Query teacher by username and password
+      // Optimized query with limit
       const teachersRef = collection(db, `artifacts/${appId}/public/data/teachers`);
       const q = query(
         teachersRef, 
         where("username", "==", formData.username),
-        where("password", "==", formData.password)
+        where("password", "==", formData.password),
+        limit(1)
       );
       
       const querySnapshot = await getDocs(q);
       
       if (!querySnapshot.empty) {
         const teacherDoc = querySnapshot.docs[0];
-        const teacherData = { id: teacherDoc.id, ...teacherDoc.data() };
+        // Essential data only
+        const teacherData = { 
+          id: teacherDoc.id, 
+          username: teacherDoc.data().username,
+          role: teacherDoc.data().role
+        };
         
-        // Store teacher info in app state
         navigateTo('teacher_dashboard', { currentUser: teacherData });
       } else {
         setError('Username atau password salah');