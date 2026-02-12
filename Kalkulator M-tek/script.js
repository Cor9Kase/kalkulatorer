// ===================================
// EMISSIONS DATA (Resultat - M-tek)
// ===================================

// Derived from sheet values in "Resultat - M-tek".
// Formulas are scaled from B22=5 and expressed as fixed + per m2 coefficients.
const emissionsData = {
    mtekEstimate: {
        materialFixed: 2.772268831128445,
        transportFixed: 46.08,
        wasteFixed: 0.31166493604653883,
        materialPerSqm: 31.99593373339319,
        wastePerSqm: 3.627543711527616
    },
    demolition: {
        materialFixed: 0,
        transportFixed: 276.48,
        wasteFixed: 0,
        materialPerSqm: 302.9770853070729,
        wastePerSqm: 50.697377709796484
    }
};

// ===================================
// PRICE DATA (Ark2 + Resultat - M-tek)
// ===================================

const rehabLookup = {
    2: { cost: 299000, days: 25 }, 3: { cost: 312000, days: 25 }, 4: { cost: 322000, days: 25 },
    5: { cost: 338000, days: 25 }, 6: { cost: 353000, days: 25 }, 7: { cost: 368000, days: 25 },
    8: { cost: 378000, days: 25 }, 9: { cost: 398000, days: 25 }, 10: { cost: 413000, days: 25 },
    11: { cost: 428000, days: 30 }, 12: { cost: 443000, days: 30 }, 13: { cost: 443000, days: 30 },
    14: { cost: 453000, days: 30 }, 15: { cost: 453000, days: 30 }, 16: { cost: 463000, days: 30 },
    17: { cost: 463000, days: 30 }, 18: { cost: 473000, days: 30 }, 19: { cost: 483000, days: 30 },
    20: { cost: 493000, days: 30 }, 21: { cost: 503000, days: 30 }, 22: { cost: 513000, days: 30 },
    23: { cost: 523000, days: 30 }, 24: { cost: 533000, days: 30 }, 25: { cost: 543000, days: 30 }
};

const mtekPrice = {
    cost: 9000,
    days: 1
};

function normalizeAreaForLookup(area) {
    const rounded = Math.round(area);
    return Math.min(25, Math.max(2, rounded));
}

// ===================================
// STATE MANAGEMENT
// ===================================

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

// ===================================
// FORMATTING FUNCTIONS
// ===================================

function formatNumber(amount, digits = 1) {
    return new Intl.NumberFormat('nb-NO', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(amount);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('nb-NO', {
        maximumFractionDigits: 0
    }).format(amount);
}

// ===================================
// UI UPDATE FUNCTIONS
// ===================================

function updateDisplay() {
    if (!isLeadSubmitted) return;

    const { area } = currentInputs;
    const areaKey = normalizeAreaForLookup(area);
    const rehab = rehabLookup[areaKey];

    const mtek = calculateMtekEstimate(area);
    const demolition = calculateDemolitionEstimate(area);
    const avoidedEmissions = Math.max(demolition.total - mtek.total, 0);

    const rehabCost = rehab.cost;
    const savedCost = Math.max(rehabCost - mtekPrice.cost, 0);

    if (elements.metaArea) {
        elements.metaArea.textContent = `${areaKey} m²`;
    }
    if (elements.metaDays) {
        elements.metaDays.textContent = `${rehab.days} døgn`;
    }

    elements.costLabel.textContent = 'Estimert kostnad (M-Tek)';
    elements.costValue.textContent = formatCurrency(mtekPrice.cost);
    elements.costUnit.textContent = 'kr';

    elements.timeLabel.textContent = 'Bespart kostnad';
    elements.timeValue.textContent = formatCurrency(savedCost);
    elements.timeUnit.textContent = 'kr';

    elements.materialLabel.textContent = 'Unngåtte utslipp';
    elements.materialSavings.textContent = formatNumber(avoidedEmissions, 1);
    elements.materialSavingsUnit.textContent = 'kgCO2e';

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

function handleLeadSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('leadName') ? document.getElementById('leadName').value : document.getElementById('name').value;
    const phone = document.getElementById('leadPhone') ? document.getElementById('leadPhone').value : document.getElementById('phone').value;
    const email = document.getElementById('leadEmail') ? document.getElementById('leadEmail').value : document.getElementById('email').value;

    if (name && phone && email) {
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
        costLabel: document.getElementById('costLabel'),
        costValue: document.getElementById('costValue'),
        costUnit: document.getElementById('costUnit'),
        timeLabel: document.getElementById('timeLabel'),
        timeValue: document.getElementById('timeValue'),
        timeUnit: document.getElementById('timeUnit'),
        materialLabel: document.getElementById('materialLabel'),
        materialSavings: document.getElementById('materialSavings'),
        materialSavingsUnit: document.getElementById('materialSavingsUnit'),
        metaArea: document.getElementById('metaArea'),
        metaDays: document.getElementById('metaDays')
    };

    currentInputs = {
        area: elements.areaSlider ? parseFloat(elements.areaSlider.value) : 6
    };

    initializeCalculator();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
