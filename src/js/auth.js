import { auth, db } from './firebaseConfig.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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

export const getCurrentUser = () => currentUser;
export const setOnLoginSuccess = (fn) => { onLoginSuccess = fn; };

// Listen to Auth State Changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is signed in, fetch additional profile data from Firestore
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const profileData = userDoc.data();
                currentUser = { 
                    id: user.uid, 
                    email: user.email, 
                    name: user.displayName || profileData.name, 
                    photoURL: user.photoURL,
                    ...profileData 
                };
            } else {
                // Fallback if no firestore doc (should depend on registration)
                currentUser = {
                    id: user.uid,
                    email: user.email,
                    name: user.displayName,
                    photoURL: user.photoURL,
                    role: 'socio7x7' // default
                };
            }
            
            // Trigger UI update
            if (onLoginSuccess) onLoginSuccess(currentUser);
            
            // Keep localStorage for fast initial load (optional, but good for perceived perf)
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (error) {
            console.error("Error fetching user profile:", error);
            showToast("Error cargando perfil de usuario", "error");
        }
    } else {
        // User is signed out
        currentUser = null;
        localStorage.removeItem('currentUser');
        const appScreen = document.getElementById('app-screen');
        if (appScreen && !appScreen.classList.contains('hidden')) {
             // If we were in app, reload to go to login
             window.location.reload();
        }
    }
});

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
