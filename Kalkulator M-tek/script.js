// ===================================
// PRICING DATA & CONFIGURATION
// ===================================

const pricingData = {
    // Base costs per square meter
    baseCosts: {
        demolition: {
            costPerSqm: 9500,      // kr per m²
            timePerSqm: 3,         // days per m²
            minCost: 50000,        // Minimum cost
            minTime: 14,           // Minimum days
        },
        repair: {
            varmekabler: {
                baseCost: 42500,
                timeInDays: 1,
            }
        },
    }
};

// ===================================
// STATE MANAGEMENT
// ===================================

let currentView = 'repair'; // 'repair' or 'demolition'
let currentInputs = {
    area: 6,
    damageType: 'varmekabler'
};
let isLeadSubmitted = false;

// ===================================
// DOM ELEMENTS
// ===================================

let elements = {};

// ===================================
// CALCULATION FUNCTIONS
// ===================================

function calculateDemolitionCost(area) {
    const { costPerSqm, minCost, timePerSqm, minTime } = pricingData.baseCosts.demolition;

    const cost = Math.max(area * costPerSqm, minCost);
    const time = Math.max(Math.ceil(area * timePerSqm), minTime);

    return { cost, time };
}

function calculateRepairCost(area, damageType) {
    const repairData = pricingData.baseCosts.repair[damageType];

    // Fixed price ("sjablong") regardless of area for these specific repairs
    const cost = repairData.baseCost;
    const time = repairData.timeInDays;

    return { cost, time };
}

// ===================================
// FORMATTING FUNCTIONS
// ===================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('nb-NO', {
        style: 'currency',
        currency: 'NOK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDays(days) {
    if (days === 1) return '1 dag';
    if (days < 7) return `${days} dager`;
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 uke' : `${weeks} uker`;
}

// ===================================
// UI UPDATE FUNCTIONS
// ===================================

function updateDisplay() {
    // Only update display if lead form is submitted
    if (!isLeadSubmitted) return;

    const { area } = currentInputs;
    const damageType = 'varmekabler'; // Exclusively for heating cables now

    const demolition = calculateDemolitionCost(area);
    const repair = calculateRepairCost(area, damageType);

    if (currentView === 'repair') {
        elements.costValue.textContent = formatCurrency(repair.cost);
        // M-Tek emphasizes heat back on 1 day
        elements.timeValue.textContent = "1 dag";

        // Show environmental savings if elements exist
        if (elements.materialSavings) {
            elements.materialSavings.textContent = "95";
        }
    } else {
        elements.costValue.textContent = formatCurrency(demolition.cost);
        elements.timeValue.textContent = formatDays(demolition.time);

        if (elements.materialSavings) {
            elements.materialSavings.textContent = "0";
        }
    }

    animateResults();
}

function animateResults() {
    const resultCards = document.querySelectorAll('.result-card');
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

    elements.toggleBtns.forEach(btn => {
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
        console.log('Lead captured for M-Tek:', { name, phone, email, inputs: currentInputs });

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
    // Slider Events
    elements.areaSlider.addEventListener('input', (e) => {
        handleAreaChange(e.target.value);
    });

    // Navigation and Form Events
    elements.nextBtn.addEventListener('click', handleNextStep);

    // Toggle View Events
    elements.toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            handleViewToggle(btn.dataset.view);
        });
    });

    elements.leadForm.addEventListener('submit', handleLeadSubmit);

    // Support module submitBtn if present
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
        area: elements.areaSlider ? parseFloat(elements.areaSlider.value) : 6,
        damageType: 'varmekabler'
    };

    initializeCalculator();

    console.log('✅ M-Tek Technical Dashboard initialized');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
