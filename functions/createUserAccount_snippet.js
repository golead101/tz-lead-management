
/**
 * 5. createUserAccount
 * Callable function to securely create Firebase Auth users and Firestore user documents.
 * Only callable by users with the 'Admin' role.
 */
exports.createUserAccount = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check if the caller is an Admin
  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists || callerDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Admins can create new user accounts.'
    );
  }

  const { email, password, name, role } = data;

  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields (email, password, name, role).'
    );
  }

  try {
    // 1. Create the user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // 2. Create the user document in Firestore
    const userDocData = {
      email: email.toLowerCase().trim(),
      name: name,
      role: role,
      status: 'Active',
      id: userRecord.uid,
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(userRecord.uid).set(userDocData);

    return {
      success: true,
      message: `Successfully created user account for ${name}`,
      uid: userRecord.uid
    };
  } catch (error) {
    console.error('Error creating new user account:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create user account: ' + error.message
    );
  }
});
