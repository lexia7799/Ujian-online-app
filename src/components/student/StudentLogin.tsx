@@ .. @@
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setError('');
     setIsLoading(true);

     try {
-      // Query student by username and password
+      // Optimized query with limit for faster response
       const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
       const q = query(
         studentsRef, 
         where("username", "==", formData.username),
-        where("password", "==", formData.password)
+        where("password", "==", formData.password),
+        limit(1) // Only need one match
       );
       
       const querySnapshot = await getDocs(q);
       
       if (!querySnapshot.empty) {
         const studentDoc = querySnapshot.docs[0];
-        const studentData = { id: studentDoc.id, ...studentDoc.data() };
+        // Only get essential data for faster loading
+        const studentData = { 
+          id: studentDoc.id, 
+          username: studentDoc.data().username,
+          role: studentDoc.data().role,
+          fullName: studentDoc.data().fullName
+        };
         
-        // Store student info in app state
         navigateTo('student_dashboard', { currentUser: studentData });
       } else {
         setError('Username atau password salah');