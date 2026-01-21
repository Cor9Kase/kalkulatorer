// ===================================
// PRICING DATA & CONFIGURATION
// ===================================

const pricingData = {
    // Base costs per square meter
    baseCosts: {
        demolition: {
            costPerSqm: 8500,      // kr per m²
            timePerSqm: 3,         // days per m²
            minCost: 45000,        // Minimum cost
            minTime: 14,           // Minimum days
        },
        repair: {
            sisterne: {
                baseCost: 47500, // Average of 45k-50k
                timeInDays: 2,
            },
            sluk: {
                baseCost: 37500, // Average of 35k-40k
                timeInDays: 1,
            },
            terskel: {
                baseCost: 32500, // Average of 30k-35k
                timeInDays: 1,
            },
            ror: {
                baseCost: 27500, // Average of 25k-30k
                timeInDays: 1,
            },
            flis: {
                baseCost: 12000,
                timeInDays: 1,
            }
        },

    }
};
// STATE MANAGEMENT
// ===================================

let currentView = 'repair'; // 'repair' or 'demolition'
let currentInputs = {
    area: 6,
    damageType: 'sisterne'
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

    const { area, damageType } = currentInputs;

    const demolition = calculateDemolitionCost(area);
    const repair = calculateRepairCost(area, damageType);

    if (currentView === 'repair') {
        // Show repair costs
        elements.costValue.textContent = formatCurrency(repair.cost);
        elements.timeValue.textContent = formatDays(repair.time);
    } else {
        // Show demolition costs
        elements.costValue.textContent = formatCurrency(demolition.cost);
        elements.timeValue.textContent = formatDays(demolition.time);
    }

    // Add animation
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

function handleDamageTypeSelect(value) {
    currentInputs.damageType = value;

    // Update active state
    elements.damageBtns.forEach(btn => {
        if (btn.dataset.value === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    updateDisplay();
}

function handleNextStep() {
    elements.leadFormSection.classList.remove('hidden');
    elements.leadFormSection.scrollIntoView({ behavior: 'smooth' });
}



function handleViewToggle(view) {
    currentView = view;

    // Update toggle buttons
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
    if (e && e.preventDefault) e.preventDefault();
    console.log("Form submitted via JS, processing...");

    const name = document.getElementById('leadName').value;
    const phone = document.getElementById('leadPhone').value;
    const email = document.getElementById('leadEmail').value;

    if (!name || !phone || !email) {
        // Fallback validation visual
        if (elements.leadForm.reportValidity) {
            elements.leadForm.reportValidity();
        }
        return;
    }

    // 1. UPDATE UI IMMEDIATELY (Don't wait for API)
    // This ensures the calculator feels responsive regardless of network/API status
    console.log("Updating UI...");
    isLeadSubmitted = true;
    elements.leadFormSection.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');
    updateDisplay();

    // Small delay to ensure DOM update before scroll
    setTimeout(() => {
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // 2. SEND TO HUBSPOT IN BACKGROUND
    const nameParts = name.trim().split(' ');
    const firstname = nameParts[0];
    const lastname = nameParts.slice(1).join(' ') || '-';

    const portalId = '146138890';
    const formId = '08dbda62-10f1-433b-8da6-e3097c40576e';
    const url = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

    const data = {
        fields: [
            { name: 'firstname', value: firstname },
            { name: 'lastname', value: lastname },
            { name: 'email', value: email },
            { name: 'phone', value: phone }
        ],
        context: {
            pageUri: window.location.href,
            pageName: document.title
        }
    };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            console.log('HubSpot submission successful:', data);
        })
        .catch(error => {
            console.error('HubSpot submission error:', error);
        });
}

// ===================================

function initEventListeners() {
    // Area slider
    elements.areaSlider.addEventListener('input', (e) => {
        handleAreaChange(e.target.value);
    });

    // Damage type buttons
    elements.damageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            handleDamageTypeSelect(btn.dataset.value);
        });
    });

    // Next button
    elements.nextBtn.addEventListener('click', handleNextStep);

    // View toggle buttons
    elements.toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            handleViewToggle(btn.dataset.view);
        });
    });

    // Lead form submission (Click on button)
    if (elements.submitBtn) {
        elements.submitBtn.addEventListener('click', handleLeadSubmit);
    }

    // Lead form submission (Enter key)
    if (elements.leadForm) {
        elements.leadForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent native submit
                handleLeadSubmit(e);
            }
        });
    }
}



// ===================================
// INITIALIZATION
// ===================================

function init() {
    // Initialize elements
    // Initialize elements
    elements = {
        areaSlider: document.getElementById('areaSlider'),
        areaDisplay: document.getElementById('areaDisplay'),
        damageBtns: document.querySelectorAll('.damage-btn'),
        nextBtn: document.getElementById('nextBtn'),
        leadFormSection: document.getElementById('leadFormSection'),
        leadForm: document.getElementById('leadForm'),
        submitBtn: document.getElementById('submitBtn'),
        resultsSection: document.getElementById('resultsSection'),
        toggleBtns: document.querySelectorAll('.toggle-btn'),
        costValue: document.getElementById('costValue'),
        timeValue: document.getElementById('timeValue')
    };

    // Set initial values
    currentInputs = {
        area: parseFloat(elements.areaSlider.value),
        damageType: 'sisterne' // Default
    };

    // Initialize event listeners
    initEventListeners();

    console.log('✅ Bevar Priskalkulator initialized');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for potential external use
window.BevarCalculator = {
    calculateDemolitionCost,
    calculateRepairCost,
    formatCurrency,
    formatDays
};
