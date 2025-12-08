import { auth, db } from './firebaseConfig.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import Toastify from 'toastify-js';

// Helper for Toasts (Kept for compatibility)
export const showToast = (text, type = 'info') => {
    const bgColors = {
        'success': "#10B981", 
        'error': "#EF4444",   
        'info': "#3B82F6",    
        'warning': "#F59E0B"  
    };
    Toastify({
        text: text,
        duration: 3000,
        gravity: "top", 
        position: "right",
        backgroundColor: bgColors[type] || bgColors['info'],
        stopOnFocus: true, 
    }).showToast();
};

let currentUser = null;
let onLoginSuccess = null;

let onLogout = null;

export const getCurrentUser = () => currentUser;
export const setOnLoginSuccess = (fn) => { onLoginSuccess = fn; };
export const setOnLogout = (fn) => { onLogout = fn; };

// Auth Subscription & Data Listener
let unsubscribeUserDoc = null;

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in. Using onSnapshot to handle race condition on registration.
        if (unsubscribeUserDoc) unsubscribeUserDoc(); // Clear previous if any

        unsubscribeUserDoc = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const profileData = docSnap.data();
                currentUser = { 
                    id: user.uid, 
                    email: user.email, 
                    name: user.displayName || profileData.name, 
                    photoURL: user.photoURL,
                    ...profileData 
                };
            } else {
                // Profile might not exist YET (in middle of registration), or legacy.
                currentUser = {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    role: 'socio7x7'
                };
            }
            // Real-time update of UI/State whenever profile changes (or initial load)
            if (onLoginSuccess) onLoginSuccess(currentUser);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }, (error) => {
             console.error("Error listening to user profile:", error);
        });

    } else {
        // User is signed out
        if (unsubscribeUserDoc) {
            unsubscribeUserDoc();
            unsubscribeUserDoc = null;
        }
        currentUser = null;
        localStorage.removeItem('currentUser');
        
        // Fix: Check style.display since we use that for toggling, not 'hidden' class
        const appScreen = document.getElementById('app-screen');
        const isAppVisible = appScreen && appScreen.style.display !== 'none' && appScreen.style.display !== '';

        if (isAppVisible) {
             window.location.reload();
        } else if (onLogout) {
            onLogout();
        }
    }
});

export const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user profile exists in Firestore, if not create it
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: 'socio7x7',
                createdAt: new Date().toISOString()
            });
        }
        
        showToast(`Bienvenido ${user.displayName || ''}`, 'success');
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error("Google Login Error:", error);
        showToast("Error iniciando sesión con Google", "error");
    }
};

export const handleEmailLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('login-form').reset();
        showToast(`Bienvenido`, 'success');
        // onAuthStateChanged will handle the rest
    } catch (error) {
        console.error("Login Error:", error);
        let msg = "Error al iniciar sesión";
        if (error.code === 'auth/invalid-credential') msg = "Credenciales incorrectas";
        if (error.code === 'auth/user-not-found') msg = "Usuario no encontrado";
        if (error.code === 'auth/wrong-password') msg = "Contraseña incorrecta";
        showToast(msg, 'error');
    }
};

export const handleRegister = async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const company = document.getElementById('register-company').value;
    const position = document.getElementById('register-position').value;
    const phone = document.getElementById('register-phone').value;
    
    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Display Name
        await updateProfile(user, {
            displayName: name,
            photoURL: `https://placehold.co/100x100/d1fae5/065f46?text=${name.charAt(0)}`
        });

        // 3. Create Firestore Document
        const newUserProfile = {
            name: name,
            email: email,
            company: company,
            position: position,
            phone: phone,
            role: 'socio7x7',
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "users", user.uid), newUserProfile);

        showToast('¡Registro exitoso!', 'success');
        document.getElementById('register-form').reset();
        
        // Auto-login happens via onAuthStateChanged
    } catch (error) {
        console.error("Register Error:", error);
        let msg = "Error al registrarse";
        if (error.code === 'auth/email-already-in-use') msg = "El email ya está registrado";
        if (error.code === 'auth/weak-password') msg = "La contraseña es muy débil (mín 6 caracteres)";
        showToast(msg, 'error');
    }
};

export const handleForgotPassword = async (e) => {
    e.preventDefault();
    // For now just toast, as implementation plan didn't specify strict password reset flow yet
    // but we can add sendPasswordResetEmail logic easily.
    showToast(`Funcionalidad de recuperación próximamente disponible con Firebase.`, 'info');
    document.getElementById('forgot-password-form').reset();
};

export const handleLogout = async () => {
    try {
        await signOut(auth);
        document.getElementById('whatsapp-button').classList.add('hidden');
        showToast('Sesión cerrada', 'info');
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

export const updateCurrentUser = async (updates) => {
    if (!currentUser) return;
    
    // Optimistic update
    Object.assign(currentUser, updates);
    localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Keep local sync
    
    try {
        await updateDoc(doc(db, "users", currentUser.id), updates);
        showToast('Perfil actualizado', 'success');
    } catch (error) {
        console.error("Update Profile Error:", error);
        showToast('Error al guardar cambios en el servidor', 'warning');
    }
};
