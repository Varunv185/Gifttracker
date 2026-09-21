import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBljwHRDVqAuNAG9pwxeYWB39ocj_had7w",
    authDomain: "gifttracker-82492.firebaseapp.com",
    projectId: "gifttracker-82492",
    storageBucket: "gifttracker-82492.firebasestorage.app",
    messagingSenderId: "143848687368",
    appId: "1:143848687368:web:527635cdfc2f8309b28ebd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let currentPoolId = "Team-Gift-Pool";
let payments = {};
let currentBudget = 5000;
let unsubscribe = null; 
let currentUserName = "Organizer";

onAuthStateChanged(auth, (user) => {
    const authBtn = document.getElementById('openAuthModalBtn');
    const profilePill = document.getElementById('userProfilePill');
    
    if (user) {
        if (authBtn) authBtn.style.display = 'none';
        if (profilePill) profilePill.style.display = 'flex';
        
        const derivedName = user.displayName || user.email.split('@')[0];
        currentUserName = derivedName;
        localStorage.setItem('giftpool_username', currentUserName);

        const nameDisp = document.getElementById('userNameDisplay');
        const emailDisp = document.getElementById('userEmailDisplay');
        const welcomeText = document.getElementById('heroWelcomeText');
        if (nameDisp) nameDisp.innerText = currentUserName;
        if (emailDisp) emailDisp.innerText = user.email;
        if (welcomeText) welcomeText.innerText = `Hi ${currentUserName}! 👋`;
        
        const avatarImg = document.getElementById('userAvatarImg');
        if (avatarImg) {
            avatarImg.src = user.photoURL || "https://www.gstatic.com/images/branding/product/1x/avatar_circle_grey_48dp.png";
        }
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal) welcomeModal.style.display = 'none';
    } else {
        if (authBtn) authBtn.style.display = 'flex';
        if (profilePill) profilePill.style.display = 'none';

        const savedName = localStorage.getItem('giftpool_username');
        if (savedName) {
            currentUserName = savedName;
            const nameDisp = document.getElementById('userNameDisplay');
            const welcomeText = document.getElementById('heroWelcomeText');
            if (nameDisp) nameDisp.innerText = currentUserName;
            if (welcomeText) welcomeText.innerText = `Hi ${currentUserName}! 👋`;
            const welcomeModal = document.getElementById('welcomeModal');
            if (welcomeModal) welcomeModal.style.display = 'none';
        } else {
            const welcomeModal = document.getElementById('welcomeModal');
            if (welcomeModal) welcomeModal.style.display = 'flex';
        }
    }
    loadPool();
});

window.openAuthModal = () => { document.getElementById('authModal').style.display = 'flex'; };
window.closeAuthModal = () => { document.getElementById('authModal').style.display = 'none'; };

window.signInWithGoogle = async function() {
    try {
        await signInWithPopup(auth, googleProvider);
        window.closeAuthModal();
    } catch (error) {
        alert("Google Sign-In error: " + error.message);
    }
};

window.handleEmailSignIn = async function() {
    const email = document.getElementById('authEmailInput').value.trim();
    const pass = document.getElementById('authPasswordInput').value;
    if (!email || !pass) return alert("Please enter email and password.");
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.closeAuthModal();
    } catch (error) { alert("Sign-in failed: " + error.message); }
};

window.handleEmailSignUp = async function() {
    const email = document.getElementById('authEmailInput').value.trim();
    const pass = document.getElementById('authPasswordInput').value;
    if (!email || !pass) return alert("Please enter email and password.");
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const username = email.split('@')[0];
        await updateProfile(userCredential.user, { displayName: username });
        window.closeAuthModal();
        alert("Account created successfully!");
    } catch (error) { alert("Registration failed: " + error.message); }
};

window.signOutUser = async function() { await signOut(auth); };

window.saveWelcomeName = function() {
    const nameInput = document.getElementById('welcomeNameInput').value.trim();
    if (!nameInput) return alert("Please enter your name to continue.");
    currentUserName = nameInput;
    localStorage.setItem('giftpool_username', currentUserName);
    document.getElementById('userNameDisplay').innerText = currentUserName;
    document.getElementById('heroWelcomeText').innerText = `Hi ${currentUserName}! 👋`;
    document.getElementById('welcomeModal').style.display = 'none';
    loadPool();
};

window.loadPool = function() {
    const inputId = document.getElementById('poolIdInput').value.trim();
    if (!inputId) return;
    
    currentPoolId = inputId;
    if (unsubscribe) unsubscribe();

    document.getElementById('heroPoolTitle').innerText = currentPoolId;

    const poolRef = doc(db, "pools", currentPoolId);
    unsubscribe = onSnapshot(poolRef, (docSnap) => {
        const setupCard = document.getElementById('newPoolSetupCard');
        if (docSnap.exists()) {
            const data = docSnap.data();
            payments = data.payments || {};
            currentBudget = data.budget || 5000;
            if (setupCard) setupCard.style.display = 'none';
        } else {
            payments = {};
            currentBudget = 5000;
            const titleDisp = document.getElementById('setupPoolTitleDisplay');
            if (titleDisp) titleDisp.innerText = currentPoolId;
            const budgetInput = document.getElementById('setupBudgetInput');
            if (budgetInput) budgetInput.value = 5000;
            const firstMember = document.getElementById('setupFirstMemberInput');
            if (firstMember) firstMember.value = currentUserName;
            const firstAmt = document.getElementById('setupFirstMemberAmountInput');
            if (firstAmt) firstAmt.value = 0;
            if (setupCard) setupCard.style.display = 'block';
        }
        const mainBudget = document.getElementById('budgetInput');
        if (mainBudget) mainBudget.value = currentBudget;
        updateDashboardUI();
    });
};

window.deleteCurrentPool = async function() {
    if (!currentPoolId) return;
    if (confirm(`Are you sure you want to mark "${currentPoolId}" as completed and delete all its data from Firebase?`)) {
        try {
            await deleteDoc(doc(db, "pools", currentPoolId));
            alert(`Pool "${currentPoolId}" has been deleted successfully.`);
            document.getElementById('poolIdInput').value = "Team-Gift-Pool";
            loadPool();
        } catch (e) {
            alert("Error deleting pool: " + e.message);
        }
    }
};

window.initializeNewPoolFromCard = function() {
    const budgetVal = parseFloat(document.getElementById('setupBudgetInput').value) || 5000;
    const memberName = document.getElementById('setupFirstMemberInput').value.trim() || currentUserName;
    const memberAmount = parseFloat(document.getElementById('setupFirstMemberAmountInput').value) || 0;
    
    currentBudget = budgetVal;
    payments = {};
    if (memberName) {
        payments[memberName] = memberAmount;
    }
    
    saveToFirebase();
    const setupCard = document.getElementById('newPoolSetupCard');
    if (setupCard) setupCard.style.display = 'none';
    updateDashboardUI();
};

window.promptChangeBudget = function() {
    const newB = prompt("Enter new target budget limit for this pool (₹):", currentBudget);
    if (newB !== null && !isNaN(newB)) {
        currentBudget = parseFloat(newB);
        document.getElementById('budgetInput').value = currentBudget;
        saveToFirebase();
    }
};

window.toggleDarkMode = function() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        if (themeIcon) themeIcon.className = "fa-solid fa-moon";
    } else {
        html.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.className = "fa-solid fa-sun";
    }
};

window.openPoolsModal = function() {
    const m = document.getElementById('poolsModal');
    if (m) m.style.display = 'flex';
    fetchPoolsList();
};

async function fetchPoolsList() {
    const grid = document.getElementById('poolsGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:var(--text-muted);">Fetching Firebase dashboards...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "pools"));
        if (querySnapshot.empty) {
            grid.innerHTML = '<p>No previous pools found.</p>';
            return;
        }
        let html = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const count = data.payments ? Object.keys(data.payments).length : 0;
            html += `
                <div class="pool-card-item" onclick="selectPool('${docSnap.id}')">
                    <h4><i class="fa-solid fa-folder text-primary"></i> ${docSnap.id}</h4>
                    <p><i class="fa-solid fa-users"></i> ${count} Members | Target: ₹${data.budget || 0}</p>
                </div>`;
        });
        grid.innerHTML = html;
    } catch (e) { grid.innerHTML = '<p style="color:red;">Error loading pools.</p>'; }
}

window.closeModal = function() {
    const m = document.getElementById('poolsModal');
    if (m) m.style.display = 'none';
};

window.selectPool = function(id) {
    document.getElementById('poolIdInput').value = id;
    loadPool();
    window.closeModal();
};

window.createNewPool = function() {
    const name = document.getElementById('newPoolNameInput').value.trim();
    const customBudget = parseFloat(document.getElementById('newPoolBudgetInput').value) || 5000;
    if (!name) return alert("Enter pool name.");
    
    currentPoolId = name;
    currentBudget = customBudget;
    payments = {};
    payments[currentUserName] = 0;
    document.getElementById('poolIdInput').value = name;
    saveToFirebase();
    window.closeModal();
    updateDashboardUI();
};

window.openAddMemberModal = function() {
    const m = document.getElementById('addMemberModal');
    if (m) {
        document.getElementById('modalNameInput').value = '';
        document.getElementById('modalPaidInput').value = '';
        m.style.display = 'flex';
    }
};

window.closeAddMemberModal = function() {
    const m = document.getElementById('addMemberModal');
    if (m) m.style.display = 'none';
};

window.submitAddMemberForm = function() {
    const name = document.getElementById('modalNameInput').value.trim();
    const paid = parseFloat(document.getElementById('modalPaidInput').value) || 0;
    if (!name) return alert("Please enter a valid participant name.");

    payments[name] = (payments[name] || 0) + paid;
    saveToFirebase();
    window.closeAddMemberModal();
};

window.exportToExcel = function() {
    const names = Object.keys(payments);
    if (names.length === 0) return alert("No data available to export.");

    const fairShare = currentBudget / names.length;
    let csvContent = "Participant Name,Paid Amount (INR),Fair Share (INR),Balance (INR),Status\n";

    names.forEach(name => {
        const paid = payments[name];
        const balance = paid - fairShare;
        let status = balance > 1 ? "Overpaid" : (Math.abs(balance) <= 1 ? "Settled" : "Owes Money");
        csvContent += `"${name}",${paid.toFixed(2)},${fairShare.toFixed(2)},${balance.toFixed(2)},"${status}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${currentPoolId}_GiftPool_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.openImportModal = function() {
    const m = document.getElementById('importModal');
    if (m) {
        document.getElementById('importTextarea').value = '';
        document.getElementById('importReport').innerHTML = '';
        m.style.display = 'flex';
    }
};

window.closeImportModal = function() {
    const m = document.getElementById('importModal');
    if (m) m.style.display = 'none';
};

window.processImport = function() {
    const rawData = document.getElementById('importTextarea').value;
    if (!rawData.trim()) return alert("Please paste data to import.");
    
    const lines = rawData.split('\n');
    let report = { added: 0, merged: 0, deduplicated: 0, rejected: 0 };
    let seen = new Set();
    let batch = {};

    lines.forEach((line) => {
        if (!line.trim()) return;
        const norm = line.trim().toLowerCase();
        if (seen.has(norm)) { report.deduplicated++; return; }
        seen.add(norm);

        const parts = line.split(/[,|\t]/);
        let nPart, aPart;
        if (parts.length >= 2) {
            nPart = parts[0];
            aPart = parts[1];
        } else {
            const lastSpaceIdx = line.trim().lastIndexOf(' ');
            if (lastSpaceIdx === -1) { report.rejected++; return; }
            nPart = line.trim().substring(0, lastSpaceIdx);
            aPart = line.trim().substring(lastSpaceIdx + 1);
        }

        let cleanName = nPart.replace(/[^a-zA-Z\s]/g, '').trim();
        if (!cleanName) { report.rejected++; return; }
        cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();

        let amt = parseFloat(aPart.replace(/[^\d.-]/g, ''));
        if (isNaN(amt)) { report.rejected++; return; }

        if (batch[cleanName] !== undefined) { batch[cleanName] += amt; report.merged++; }
        else { batch[cleanName] = amt; report.added++; }
    });

    for (const [n, a] of Object.entries(batch)) {
        payments[n] = (payments[n] || 0) + a;
    }
    saveToFirebase();
    
    const reportBox = document.getElementById('importReport');
    if (reportBox) {
        reportBox.innerHTML = `
            <div style="background:var(--bg-color); padding:10px; border-radius:8px; margin-top:10px; border:1px solid var(--border); font-size:0.85rem; color:var(--success);">
                <b>Success!</b> Added: ${report.added}, Merged: ${report.merged}, Skipped: ${report.deduplicated}, Rejected: ${report.rejected}
            </div>
        `;
    }
    setTimeout(() => {
        window.closeImportModal();
        updateDashboardUI();
    }, 1500);
};

async function saveToFirebase() {
    const ref = doc(db, "pools", currentPoolId);
    await setDoc(ref, { budget: currentBudget, payments: payments });
}

window.updateBudget = function() {
    currentBudget = parseFloat(document.getElementById('budgetInput').value) || 5000;
    saveToFirebase();
};

window.removeParticipant = function(name) {
    if (confirm(`Remove ${name}?`)) {
        delete payments[name];
        saveToFirebase();
    }
};

// INSTANT UPI PAYMENT POPUP FEATURE
window.openUpiModal = function(debtor, creditor, amount) {
    const upiId = "giftpool@upi"; // Default placeholder UPI ID for the organizer/creditor
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(creditor)}&am=${amount}&cu=INR&tn=${encodeURIComponent('GiftPool Contribution')}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;

    document.getElementById('upiModalDesc').innerHTML = `Pay <b>₹${amount}</b> from <b>${debtor}</b> to <b>${creditor}</b>`;
    document.getElementById('upiQrCodeImg').src = qrApiUrl;
    document.getElementById('upiDeepLinkBtn').href = upiLink;
    document.getElementById('upiModal').style.display = 'flex';
};

window.closeUpiModal = function() {
    document.getElementById('upiModal').style.display = 'none';
};

function updateDashboardUI() {
    const names = Object.keys(payments);
    const totalCollected = Object.values(payments).reduce((a, b) => a + b, 0);
    const count = names.length;
    const fairShare = count > 0 ? currentBudget / count : 0;
    const progressPct = currentBudget > 0 ? (totalCollected / currentBudget) * 100 : 0;

    const hBud = document.getElementById('heroBudgetDisplay');
    const hCol = document.getElementById('heroCollectedDisplay');
    const hPer = document.getElementById('heroPercentDisplay');
    const hBar = document.getElementById('heroProgressBar');
    if (hBud) hBud.innerText = currentBudget.toLocaleString('en-IN');
    if (hCol) hCol.innerText = totalCollected.toLocaleString('en-IN');
    if (hPer) hPer.innerText = `${progressPct.toFixed(1)}%`;
    if (hBar) hBar.style.width = `${Math.min(progressPct, 100)}%`;

    const mCol = document.getElementById('metricCollected');
    const mPen = document.getElementById('metricPending');
    const mMem = document.getElementById('metricTotalMembers');
    const mSha = document.getElementById('metricFairShare');
    if (mCol) mCol.innerText = `₹${totalCollected.toLocaleString('en-IN')}`;
    const pending = Math.max(0, currentBudget - totalCollected);
    if (mPen) mPen.innerText = `₹${pending.toLocaleString('en-IN')}`;
    if (mMem) mMem.innerText = count;
    if (mSha) mSha.innerText = `₹${fairShare.toFixed(0)}`;

    const sText = document.getElementById('sidebarProgressText');
    const sAmt = document.getElementById('sidebarProgressAmount');
    if (sText) sText.innerText = `${progressPct.toFixed(1)}%`;
    if (sAmt) sAmt.innerText = `₹${totalCollected} / ₹${currentBudget}`;

    let fullCount = 0, partialCount = 0, extraCount = 0, noneCount = 0;
    let tableHtml = "";

    names.forEach((name, idx) => {
        const paid = payments[name];
        const balance = paid - fairShare;
        let statusBadge = "", statusClass = "";

        if (paid === 0) { noneCount++; statusBadge = "Not Paid"; statusClass = "owes"; }
        else if (balance > 1) { extraCount++; statusBadge = "Overpaid"; statusClass = "overpaid"; }
        else if (Math.abs(balance) <= 1) { fullCount++; statusBadge = "Settled"; statusClass = "settled"; }
        else { partialCount++; statusBadge = "Needs to pay"; statusClass = "owes"; }

        tableHtml += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong>${name}</strong></td>
                <td>₹${paid.toFixed(2)}</td>
                <td>₹${fairShare.toFixed(2)}</td>
                <td><span style="color: ${balance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">${balance >= 0 ? '+' : ''}₹${balance.toFixed(2)}</span></td>
                <td><span class="status-badge ${statusClass}">${statusBadge}</span></td>
                <td><button onclick="removeParticipant('${name}')" class="btn-icon-dark" title="Delete"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });

    const tbody = document.getElementById('participantTableBody');
    if (tbody) tbody.innerHTML = tableHtml || `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No members yet. Use the 'Add Member' form!</td></tr>`;
    
    const sFull = document.getElementById('statPaidFullCount');
    const sPart = document.getElementById('statPartialCount');
    const sExt = document.getElementById('statExtraCount');
    const sNot = document.getElementById('statNotPaidCount');
    const qsTot = document.getElementById('qsTotal');
    if (sFull) sFull.innerText = fullCount + extraCount;
    if (sPart) sPart.innerText = partialCount;
    if (sExt) sExt.innerText = extraCount;
    if (sNot) sNot.innerText = noneCount;
    if (qsTot) qsTot.innerText = count;

    generateSettlementActions();
}

window.filterMembersTable = function() {
    const q = document.getElementById('memberSearchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#participantTableBody tr');
    rows.forEach(row => {
        const nameText = row.children[1]?.innerText.toLowerCase() || "";
        row.style.display = nameText.includes(q) ? "" : "none";
    });
};

window.generateSettlementActions = function() {
    const fairShare = Object.keys(payments).length > 0 ? currentBudget / Object.keys(payments).length : 0;
    const balances = {};
    for (const [name, paid] of Object.entries(payments)) {
        balances[name] = paid - fairShare;
    }

    const debtors = {};
    const creditors = {};
    for (const [name, bal] of Object.entries(balances)) {
        if (bal < -0.01) debtors[name] = Math.abs(bal);
        if (bal > 0.01) creditors[name] = bal;
    }

    const txs = [];
    const dNames = Object.keys(debtors);
    const cNames = Object.keys(creditors);
    let i = 0, j = 0;

    while (i < dNames.length && j < cNames.length) {
        const d = dNames[i];
        const c = cNames[j];
        const amt = Math.min(debtors[d], creditors[c]);
        txs.push({ debtor: d, creditor: c, amount: amt.toFixed(0) });
        debtors[d] -= amt;
        creditors[c] -= amt;
        if (debtors[d] < 0.01) i++;
        if (creditors[c] < 0.01) j++;
    }

    const txCount = document.getElementById('settlementTxCount');
    const planBox = document.getElementById('settlementPlan');
    if (txCount) txCount.innerText = `${txs.length} transactions needed`;
    if (planBox) {
        planBox.innerHTML = txs.length === 0 
            ? `<div class="settlement-row"><span>✅ Everyone is perfectly settled up!</span></div>` 
            : txs.map(t => `
                <div class="settlement-row" style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${t.debtor}</strong> pays ₹${t.amount} to <strong>${t.creditor}</strong></span>
                    <button onclick="openUpiModal('${t.debtor}', '${t.creditor}', '${t.amount}')" class="btn-primary" style="padding: 4px 10px; font-size: 0.75rem;">
                        <i class="fa-solid fa-qrcode"></i> Pay Now
                    </button>
                </div>
            `).join('');
    }
};
// Mobile Sidebar & Backdrop Toggle Handler
window.toggleMobileSidebar = function() {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
        if (backdrop) {
            backdrop.classList.toggle('active');
        }
    }
};