import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface AuthState {
  user: User | null;
  businessId: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    businessName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    businessId: null,
    loading: true,
  });
  const signingUpRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (signingUpRef.current) return;

      if (user) {
        const bizDoc = await getDoc(doc(db, "businesses", user.uid));
        setState({
          user,
          businessId: bizDoc.exists() ? user.uid : null,
          loading: false,
        });
      } else {
        setState({ user: null, businessId: null, loading: false });
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    businessName: string
  ) => {
    signingUpRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const today = new Date().toISOString().split("T")[0];

      // 1. Create business doc (rule: isAuth)
      await setDoc(doc(db, "businesses", uid), {
        name: businessName,
        logo: "",
        primaryColor: "#B8926A",
        whatsappNumber: "",
        whatsappApiKey: "",
        defaultEstimatedTimePerCustomer: 10,
        approachingThreshold: 3,
        formFields: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create owner staff doc (rule: bootstrap — businessId == auth.uid)
      await setDoc(doc(db, `businesses/${uid}/staff/${uid}`), {
        email,
        name: businessName,
        role: "owner",
        createdAt: serverTimestamp(),
      });

      // 3. Create default queue (rule: isBusinessStaff — staff doc now exists)
      await addDoc(collection(db, `businesses/${uid}/queues`), {
        name: "Main Queue",
        status: "active",
        currentNumber: 0,
        nextNumber: 1,
        date: today,
        avgServiceTime: 0,
        completedCount: 0,
      });

      setState({ user: cred.user, businessId: uid, loading: false });
    } finally {
      signingUpRef.current = false;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
