const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setError('');
     setIsLoading(true);

     try {
       // Optimized query with limit for faster response
       const studentsRef = collection(db, `artifacts/${appId}/public/data/students`);
       const q = query(
         studentsRef, 
         where("username", "==", formData.username),
         where("password", "==", formData.password),
         limit(1) // Only need one match
       );
       
       const querySnapshot = await getDocs(q);
       
       if (!querySnapshot.empty) {
         const studentDoc = querySnapshot.docs[0];
         // Only get essential data for faster loading
         const studentData = { 
           id: studentDoc.id, 
           username: studentDoc.data().username,
           role: studentDoc.data().role,
           fullName: studentDoc.data().fullName
         };
         
         navigateTo('student_dashboard', { currentUser: studentData });
       } else {
         setError('Username atau password salah');
       }
     } catch (error) {
       console.error('Login error:', error);
       setError('Terjadi kesalahan saat login');
     } finally {
       setIsLoading(false);
     }
   };