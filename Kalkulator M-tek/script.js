// ===================================
// EMISSIONS DATA (Resultat - M-tek)
// ===================================

// Derived from sheet values in "Resultat - M-tek".
// Formulas are scaled from B22=5 and expressed as fixed + per m2 coefficients.
const emissionsData = {
    mtekEstimate: {
        // Case 1 + Case 2 (single estimate shown to users)
        materialFixed: 2.772268831128445,
        transportFixed: 46.08,
        wasteFixed: 0.31166493604653883,
        materialPerSqm: 31.99593373339319,
        wastePerSqm: 3.627543711527616
    },
    demolition: {
        // Base case - Rive bad uten gjenbruk
        materialFixed: 0,
        transportFixed: 276.48,
        wasteFixed: 0,
        materialPerSqm: 302.9770853070729,
        wastePerSqm: 50.697377709796484
    }
};

const pricingData = {
    demolition: {
        costPerSqm: 9500,
        minCost: 50000
    },
    repair: {
        fixedCost: 42500
    }
};

// ===================================
// STATE MANAGEMENT
// ===================================

let currentView = 'repair'; // 'repair' or 'demolition'
let currentInputs = {
    area: 6
};
let isLeadSubmitted = false;

// ===================================
// DOM ELEMENTS
// ===================================

let elements = {};

// ===================================
// CALCULATION FUNCTIONS
// ===================================

function calculateEstimate(area, model) {
    const material = model.materialFixed + area * model.materialPerSqm;
    const transport = model.transportFixed;
    const waste = model.wasteFixed + area * model.wastePerSqm;
    const total = material + transport + waste;

    return { material, transport, waste, total };
}

function calculateMtekEstimate(area) {
    return calculateEstimate(area, emissionsData.mtekEstimate);
}

function calculateDemolitionEstimate(area) {
    return calculateEstimate(area, emissionsData.demolition);
}

function calculateDemolitionCost(area) {
    return Math.max(area * pricingData.demolition.costPerSqm, pricingData.demolition.minCost);
}

function calculateRepairCost() {
    return pricingData.repair.fixedCost;
}

// ===================================
// FORMATTING FUNCTIONS
// ===================================

function formatNumber(amount) {
    return new Intl.NumberFormat('nb-NO', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(amount);
}

function formatKg(amount) {
    return `${formatNumber(amount)} kgCO2e`;
}

function formatPercent(value) {
    return new Intl.NumberFormat('nb-NO', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(value);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// ===================================
// UI UPDATE FUNCTIONS
// ===================================

function updateDisplay() {
    if (!isLeadSubmitted) return;

    const { area } = currentInputs;
    const mtek = calculateMtekEstimate(area);
    const demolition = calculateDemolitionEstimate(area);
    const repairCost = calculateRepairCost();
    const demolitionCost = calculateDemolitionCost(area);

    const avoided = Math.max(demolition.total - mtek.total, 0);
    const savingsNok = Math.max(demolitionCost - repairCost, 0);
    const reductionPct = demolitionCost > 0 ? (savingsNok / demolitionCost) * 100 : 0;

    if (currentView === 'repair') {
        elements.costValue.textContent = formatNumber(mtek.total);
        elements.timeValue.textContent = `${formatCurrency(savingsNok)} spart`;

        if (elements.materialSavings) {
            elements.materialSavings.textContent = formatPercent(reductionPct);
        }
    } else {
        elements.costValue.textContent = formatNumber(demolition.total);
        elements.timeValue.textContent = `${formatCurrency(0)} spart`;

        if (elements.materialSavings) {
            elements.materialSavings.textContent = '0,0';
        }
    }

    animateResults();
}

function animateResults() {
    const resultCards = document.querySelectorAll('.metrikk-card, .result-card');
    resultCards.forEach((card, index) => {
        card.style.animation = 'none';
        setTimeout(() => {
            card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.1}s backwards`;
        }, 10);
    });
}

// ===================================
// EVENT HANDLERS
// ===================================

function handleAreaChange(value) {
    const numValue = parseFloat(value);
    if (numValue >= 2 && numValue <= 50) {
        currentInputs.area = numValue;
        elements.areaDisplay.textContent = numValue;
        elements.areaSlider.value = numValue;
        updateDisplay();
    }
}

function handleNextStep() {
    elements.inputSection.classList.add('hidden');
    elements.leadFormSection.classList.remove('hidden');
    elements.leadFormSection.scrollIntoView({ behavior: 'smooth' });
}

function handleViewToggle(view) {
    currentView = view;

    elements.toggleBtns.forEach((btn) => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateDisplay();
}

function handleLeadSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('leadName') ? document.getElementById('leadName').value : document.getElementById('name').value;
    const phone = document.getElementById('leadPhone') ? document.getElementById('leadPhone').value : document.getElementById('phone').value;
    const email = document.getElementById('leadEmail') ? document.getElementById('leadEmail').value : document.getElementById('email').value;

    if (name && phone && email) {
        console.log('Lead captured for M-Tek:', { name, phone, email, area: currentInputs.area });

        isLeadSubmitted = true;
        elements.leadFormSection.classList.add('hidden');
        elements.resultsSection.classList.remove('hidden');

        updateDisplay();
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===================================
// INITIALIZATION
// ===================================

function initializeCalculator() {
    elements.areaSlider.addEventListener('input', (e) => {
        handleAreaChange(e.target.value);
    });

    elements.nextBtn.addEventListener('click', handleNextStep);

    elements.toggleBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            handleViewToggle(btn.dataset.view);
        });
    });

    elements.leadForm.addEventListener('submit', handleLeadSubmit);

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleLeadSubmit);
    }
}

function init() {
    elements = {
        areaSlider: document.getElementById('areaSlider'),
        areaDisplay: document.getElementById('areaDisplay'),
        inputSection: document.getElementById('inputSection'),
        nextBtn: document.getElementById('nextBtn'),
        leadFormSection: document.getElementById('leadFormSection'),
        leadForm: document.getElementById('leadForm'),
        resultsSection: document.getElementById('resultsSection'),
        toggleBtns: document.querySelectorAll('.tab-btn'),
        costValue: document.getElementById('costValue'),
        timeValue: document.getElementById('timeValue'),
        materialSavings: document.getElementById('materialSavings')
    };

    currentInputs = {
        area: elements.areaSlider ? parseFloat(elements.areaSlider.value) : 6
    };

    initializeCalculator();

    console.log('M-Tek estimator initialized with Resultat - M-tek baseline');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
