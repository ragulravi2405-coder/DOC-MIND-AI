import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { UserProfile, EduDocument, MockExamSession, MockInterviewSession, UserRole } from "../types";

// Fallback seed data so the app has instant, fully functional content on load!
const SEED_DOCUMENT: EduDocument = {
  id: "seed-ai-ml-basics",
  userId: "system",
  name: "Introduction to Neural Networks & Transformers.pdf",
  type: "application/pdf",
  size: 2450000,
  summary: `### Overview of Neural Networks & Transformers

This study document details the transition from classical multi-layer perceptrons to advanced self-attention architectures that power today's large language models.

#### 1. Multi-Layer Perceptrons (MLPs)
MLPs consist of an input layer, one or more hidden layers, and an output layer. They rely on:
* **Forward Propagation**: Passing input signals through weight-matrix dot products and non-linear activation functions (e.g., ReLU, Sigmoid).
* **Backpropagation**: Calculating gradients of the loss function with respect to weights using the chain rule, and updating parameters via Optimization algorithms (such as Stochastic Gradient Descent).

#### 2. Recurrent Neural Networks (RNNs) & LSTMs
Traditional feedforward networks struggle with sequential data (e.g., text, audio). RNNs introduce feedback loops, but suffer from the **vanishing gradient problem**. Long Short-Term Memory (LSTM) networks resolve this by introducing:
* **Cell State**: Acting as a high-speed conveyor belt to carry long-term dependencies.
* **Input, Forget, and Output Gates**: To regulate the addition or removal of information.

#### 3. The Transformer Paradigm
Introduced by Vaswani et al. in "Attention Is All You Need", Transformers discard recurrent loops entirely.
* **Self-Attention**: Allows the model to correlate every word in a sentence with every other word, regardless of their distance.
* **Multi-Head Attention**: Evaluates relationships in multiple representational subspaces simultaneously.
* **Positional Encodings**: Added to input embeddings to preserve structural, sequential sequence order.`,
  importantTopics: `### Key Chapters & Formulas

#### Chapter 1: The Linear Neuron
A neuron computes a weighted sum of its inputs and adds a bias:
$$z = \\sum (w_i x_i) + b$$
It passes this scalar through an activation function, $a = \\sigma(z)$.

#### Chapter 2: Activation Functions
1. **ReLU (Rectified Linear Unit)**: $f(x) = \\max(0, x)$ - Resolves vanishing gradients in deep networks.
2. **Sigmoid**: $f(x) = \\frac{1}{1 + e^{-x}}$ - Maps inputs to a (0,1) probability distribution.
3. **Softmax**: Converts a raw logit vector into normalized probabilities.

#### Chapter 3: Attention Mechanism Equations
Scaled Dot-Product Attention:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
Where $Q$, $K$, $V$ represent Query, Key, and Value matrices, and $d_k$ is the dimensionality of the keys.`,
  revisionNotes: `### Core Exam Revision Points

* **Gradient Descent**: Updates parameters using the rule $W \\leftarrow W - \\eta \\nabla_W L$, where $\\eta$ is the learning rate.
* **Overfitting**: When a model performs exceptionally on training data but poorly on unseen test data. Prevented via Regularization (L1/L2), Dropout, or Early Stopping.
* **Transformer Components**: Encoder (processes input context) and Decoder (generates token-by-token output auto-regressively).
* **Self-Attention Complexity**: Incurs an $O(n^2)$ computational and memory cost, limiting context window sizing.`,
  keywords: [
    { term: "Backpropagation", definition: "A mathematical algorithm that calculates the gradient of the loss function with respect to network weights to update them." },
    { term: "Overfitting", definition: "A scenario where a machine learning model fits training data too closely, losing its capacity to generalize to new datasets." },
    { term: "Self-Attention", definition: "An attention mechanism in Transformers mapping a query to a set of keys and values, calculating contextual weights for all tokens." },
    { term: "Vanishing Gradient", definition: "A challenge in deep networks where gradient signals shrink exponentially during backpropagation, stopping weight updates." },
    { term: "Epoch", definition: "One complete pass of the entire training dataset through the neural network." }
  ],
  flashcards: [
    { question: "What formula represents Scaled Dot-Product Attention?", answer: "Attention(Q, K, V) = softmax( (Q * K^T) / sqrt(d_k) ) * V" },
    { question: "What is the primary benefit of the ReLU activation function?", answer: "It introduces non-linearity and helps prevent vanishing gradients because its derivative is 1 for any positive input." },
    { question: "How does Dropout prevent overfitting?", answer: "It randomly deactivates a percentage of neurons during training, forcing the network to learn redundant representation paths." },
    { question: "What was the main breakthrough paper for Transformers?", answer: "'Attention Is All You Need' by Vaswani et al. in 2017." }
  ],
  examQuestions: [
    { id: "seed-q1", type: "mcq", question: "Who introduced the Transformer architecture in the paper 'Attention Is All You Need'?", options: ["LeCun et al.", "Vaswani et al.", "Goodfellow et al.", "Hinton et al."], correctAnswer: "Vaswani et al.", difficulty: "easy" },
    { id: "seed-q2", type: "boolean", question: "The Scaled Dot-Product Attention mechanism has a computational complexity of O(n) with respect to sequence length.", correctAnswer: "False", difficulty: "medium" },
    { id: "seed-q3", type: "fill", question: "The activation function defined as f(x) = max(0, x) is called ____________.", correctAnswer: "ReLU", difficulty: "easy" },
    { id: "seed-q4", type: "short", question: "Briefly explain the role of the Forget Gate in an LSTM network.", correctAnswer: "The forget gate determines what percentage of the previous cell state information should be discarded or kept.", difficulty: "medium" },
    { id: "seed-q5", type: "long", question: "Describe how backpropagation and gradient descent work together to train a neural network.", correctAnswer: "Backpropagation uses the calculus chain rule to calculate the partial derivatives (gradients) of the loss function with respect to each weight. Gradient descent then utilizes these gradients to update the weights in the opposite direction of the gradient to minimize the overall loss.", difficulty: "hard" },
    { id: "seed-q6", type: "mcq", question: "Which activation function maps outputs to a range between 0 and 1?", options: ["Tanh", "ReLU", "Sigmoid", "Leaky ReLU"], correctAnswer: "Sigmoid", difficulty: "easy" },
    { id: "seed-q7", type: "boolean", question: "Dropout is only applied during the inference/evaluation phase of a neural network.", correctAnswer: "False", difficulty: "medium" },
    { id: "seed-q8", type: "fill", question: "In the attention formula, the variable 'd_k' represents the dimension of the ____________.", correctAnswer: "keys", difficulty: "hard" }
  ],
  interviewQuestions: [
    { id: "seed-int1", type: "technical", mode: "beginner", question: "Can you explain the difference between supervised and unsupervised learning?", targetCriteria: "Supervised uses labeled datasets; unsupervised finds hidden patterns in unlabeled data." },
    { id: "seed-int2", type: "technical", mode: "intermediate", question: "Why is the Softmax function commonly used in the final layer of a multi-class classifier?", targetCriteria: "It converts raw scores (logits) into a probability distribution that sums to 1." },
    { id: "seed-int3", type: "technical", mode: "advanced", question: "Explain the vanishing gradient problem and detail three separate techniques to mitigate it.", targetCriteria: "Identifies gradient degradation; suggests ReLU, residual links, batchnorm, or weight initialization." },
    { id: "seed-int4", type: "hr", mode: "beginner", question: "Why do you want to work as an AI researcher, and what areas of deep learning excite you most?", targetCriteria: "Passionate interest in AI developments, specific subfields (e.g. NLP, CV, agentic systems)." },
    { id: "seed-int5", type: "viva", mode: "intermediate", question: "Walk me through the mathematical scaling factor in Transformer self-attention. Why divide by the square root of d_k?", targetCriteria: "Prevents dot products from growing excessively large for high dimensions, which would push softmax into flat regions with tiny gradients." }
  ],
  createdAt: new Date().toISOString()
};

// State variables for safe local fallback when Firebase lacks active project bounds
let localUsers: UserProfile[] = JSON.parse(localStorage.getItem("edumind_users") || "[]");
let activeLocalUser: UserProfile | null = JSON.parse(localStorage.getItem("edumind_current_user") || "null");

export function getActiveUser(): UserProfile | null {
  return activeLocalUser;
}

// 1. Auth: Sign Up
export async function signUpUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
): Promise<UserProfile> {
  const adminEmail = "ragulravi2405@gmail.com";
  // Enforce admin email assignment
  const assignedRole: UserRole = email.toLowerCase() === adminEmail.toLowerCase() ? "admin" : role;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { displayName });

    const profile: UserProfile = {
      uid: userCred.user.uid,
      email,
      displayName,
      role: assignedRole,
      createdAt: new Date().toISOString(),
    };

    // Save in Firestore
    try {
      await setDoc(doc(db, "users", profile.uid), profile);
    } catch (e) {
      console.warn("Firestore save failed, using local storage fallback for user profile.", e);
    }

    // Save locally
    localUsers.push(profile);
    localStorage.setItem("edumind_users", JSON.stringify(localUsers));
    activeLocalUser = profile;
    localStorage.setItem("edumind_current_user", JSON.stringify(profile));
    return profile;
  } catch (error) {
    console.warn("Firebase email sign up failed. Operating in Sandbox local mode.", error);
    
    // Check if email already registered locally
    if (localUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already in use.");
    }

    const localUid = "local-" + Math.random().toString(36).substr(2, 9);
    const profile: UserProfile = {
      uid: localUid,
      email,
      displayName,
      role: assignedRole,
      createdAt: new Date().toISOString(),
    };

    localUsers.push(profile);
    localStorage.setItem("edumind_users", JSON.stringify(localUsers));
    activeLocalUser = profile;
    localStorage.setItem("edumind_current_user", JSON.stringify(profile));
    return profile;
  }
}

// 2. Auth: Login
export async function loginUser(email: string, password: string): Promise<UserProfile> {
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    
    let profile: UserProfile | null = null;
    try {
      const docSnap = await getDoc(doc(db, "users", userCred.user.uid));
      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      }
    } catch (e) {
      console.warn("Firestore profile fetch failed during login. Querying local backup.", e);
    }

    if (!profile) {
      const adminEmail = "ragulravi2405@gmail.com";
      const assignedRole: UserRole = email.toLowerCase() === adminEmail.toLowerCase() ? "admin" : "student";
      
      profile = {
        uid: userCred.user.uid,
        email: userCred.user.email || email,
        displayName: userCred.user.displayName || email.split("@")[0],
        role: assignedRole,
        createdAt: new Date().toISOString(),
      };
    }

    activeLocalUser = profile;
    localStorage.setItem("edumind_current_user", JSON.stringify(profile));
    return profile;
  } catch (error) {
    console.warn("Firebase login failed. Checking sandbox offline accounts.", error);
    const matching = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matching) {
      activeLocalUser = matching;
      localStorage.setItem("edumind_current_user", JSON.stringify(matching));
      return matching;
    }
    throw new Error("Invalid credentials or no account registered.");
  }
}

// 3. Auth: Logout
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signout failed", e);
  }
  activeLocalUser = null;
  localStorage.removeItem("edumind_current_user");
}

// 4. Document management
export async function saveDocument(docData: EduDocument): Promise<void> {
  try {
    await setDoc(doc(db, "documents", docData.id), docData);
  } catch (e) {
    console.warn("Firestore document save failed, storing locally.", e);
  }
  
  const docs: EduDocument[] = JSON.parse(localStorage.getItem("edumind_documents") || "[]");
  // Remove existing if duplicate ID
  const filtered = docs.filter(d => d.id !== docData.id);
  filtered.push(docData);
  localStorage.setItem("edumind_documents", JSON.stringify(filtered));
}

export async function getDocuments(): Promise<EduDocument[]> {
  let cloudDocs: EduDocument[] = [];
  try {
    const q = query(collection(db, "documents"));
    const querySnap = await getDocs(q);
    querySnap.forEach(doc => {
      cloudDocs.push(doc.data() as EduDocument);
    });
  } catch (e) {
    console.warn("Could not retrieve documents from Cloud Firestore. Using local fallback.", e);
  }

  const localDocs: EduDocument[] = JSON.parse(localStorage.getItem("edumind_documents") || "[]");
  
  // Merge and prioritize unique IDs (Cloud first, then local, always guarantee the SEED document is present)
  const map = new Map<string, EduDocument>();
  map.set(SEED_DOCUMENT.id, SEED_DOCUMENT);
  
  localDocs.forEach(d => map.set(d.id, d));
  cloudDocs.forEach(d => map.set(d.id, d));
  
  return Array.from(map.values());
}

export async function deleteDocument(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "documents", docId));
  } catch (e) {
    console.warn("Firestore document delete failed.", e);
  }
  const localDocs: EduDocument[] = JSON.parse(localStorage.getItem("edumind_documents") || "[]");
  const filtered = localDocs.filter(d => d.id !== docId);
  localStorage.setItem("edumind_documents", JSON.stringify(filtered));
}

// 5. Exam Sessions
export async function saveExamSession(session: MockExamSession): Promise<void> {
  try {
    await setDoc(doc(db, "exams", session.id), session);
  } catch (e) {
    console.warn("Firestore exam save failed.", e);
  }
  const exams: MockExamSession[] = JSON.parse(localStorage.getItem("edumind_exams") || "[]");
  exams.push(session);
  localStorage.setItem("edumind_exams", JSON.stringify(exams));
}

export async function getExamSessions(): Promise<MockExamSession[]> {
  let cloudExams: MockExamSession[] = [];
  try {
    const querySnap = await getDocs(collection(db, "exams"));
    querySnap.forEach(doc => {
      cloudExams.push(doc.data() as MockExamSession);
    });
  } catch (e) {
    console.warn("Could not retrieve exams from Cloud Firestore. Using local fallback.", e);
  }
  const localExams: MockExamSession[] = JSON.parse(localStorage.getItem("edumind_exams") || "[]");
  const map = new Map<string, MockExamSession>();
  localExams.forEach(x => map.set(x.id, x));
  cloudExams.forEach(x => map.set(x.id, x));
  return Array.from(map.values()).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

// 6. Interview Sessions
export async function saveInterviewSession(session: MockInterviewSession): Promise<void> {
  try {
    await setDoc(doc(db, "interviews", session.id), session);
  } catch (e) {
    console.warn("Firestore interview save failed.", e);
  }
  const interviews: MockInterviewSession[] = JSON.parse(localStorage.getItem("edumind_interviews") || "[]");
  interviews.push(session);
  localStorage.setItem("edumind_interviews", JSON.stringify(interviews));
}

export async function getInterviewSessions(): Promise<MockInterviewSession[]> {
  let cloudInterviews: MockInterviewSession[] = [];
  try {
    const querySnap = await getDocs(collection(db, "interviews"));
    querySnap.forEach(doc => {
      cloudInterviews.push(doc.data() as MockInterviewSession);
    });
  } catch (e) {
    console.warn("Could not retrieve interviews from Cloud Firestore. Using local fallback.", e);
  }
  const localInterviews: MockInterviewSession[] = JSON.parse(localStorage.getItem("edumind_interviews") || "[]");
  const map = new Map<string, MockInterviewSession>();
  localInterviews.forEach(x => map.set(x.id, x));
  cloudInterviews.forEach(x => map.set(x.id, x));
  return Array.from(map.values()).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

// Admin helper: Get all registered user profiles
export async function getAllUsers(): Promise<UserProfile[]> {
  let cloudUsers: UserProfile[] = [];
  try {
    const querySnap = await getDocs(collection(db, "users"));
    querySnap.forEach(doc => {
      cloudUsers.push(doc.data() as UserProfile);
    });
  } catch (e) {
    console.warn("Could not retrieve users from Cloud Firestore.", e);
  }
  
  const map = new Map<string, UserProfile>();
  localUsers.forEach(u => map.set(u.uid, u));
  cloudUsers.forEach(u => map.set(u.uid, u));
  return Array.from(map.values());
}
