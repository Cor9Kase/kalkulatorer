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
const CALCULATION_DELAY_MS = 1000;
const CALCULATING_LABEL = 'Kalkulerer...';

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
let isResultTransitioning = false;
const metricAnimationState = {
    cost: { value: 0, rafId: null, timeoutId: null },
    savings: { value: 0, rafId: null, timeoutId: null },
    emissions: { value: 0, rafId: null, timeoutId: null }
};
let metricAnimationSequence = 0;

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

function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
}

function setButtonLoadingState(button, isLoading, label = CALCULATING_LABEL) {
    if (!button) return;

    if (isLoading) {
        if (!button.dataset.originalHtml) {
            button.dataset.originalHtml = button.innerHTML;
        }
        button.classList.add('is-loading');
        button.setAttribute('aria-busy', 'true');
        button.disabled = true;
        button.textContent = label;
        return;
    }

    if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
    }
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
    button.disabled = false;
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
    elements.costUnit.textContent = 'kr';

    elements.timeLabel.textContent = 'Bespart kostnad';
    elements.timeUnit.textContent = 'kr';

    elements.materialLabel.textContent = 'Unngåtte utslipp';
    elements.materialSavingsUnit.textContent = 'kgCO2e';

    animateMetricsSequential(mtekPrice.cost, savedCost, avoidedEmissions);

    animateResults();
}

function animateMetricsSequential(cost, savings, emissions) {
    metricAnimationSequence += 1;
    const sequenceId = metricAnimationSequence;

    animateMetricValue('cost', elements.costValue, cost, (value) => formatCurrency(Math.round(value)), 700, 0, sequenceId);
    animateMetricValue('savings', elements.timeValue, savings, (value) => formatCurrency(Math.round(value)), 800, 350, sequenceId);
    animateMetricValue('emissions', elements.materialSavings, emissions, (value) => formatNumber(value, 1), 900, 760, sequenceId);
}

function animateMetricValue(key, element, target, formatter, duration = 900, delay = 0, sequenceId = metricAnimationSequence) {
    if (!element || !metricAnimationState[key]) return;

    const state = metricAnimationState[key];

    if (state.rafId) {
        cancelAnimationFrame(state.rafId);
    }
    if (state.timeoutId) {
        clearTimeout(state.timeoutId);
    }

    const from = state.value;

    function startAnimation() {
        if (sequenceId !== metricAnimationSequence) return;

        const startTime = performance.now();

        function step(timestamp) {
            if (sequenceId !== metricAnimationSequence) {
                state.rafId = null;
                return;
            }

            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const currentValue = from + (target - from) * easedProgress;

            state.value = currentValue;
            element.textContent = formatter(currentValue);

            if (progress < 1) {
                state.rafId = requestAnimationFrame(step);
                return;
            }

            state.value = target;
            state.rafId = null;
            element.textContent = formatter(target);
        }

        state.rafId = requestAnimationFrame(step);
    }

    if (delay > 0) {
        state.timeoutId = setTimeout(() => {
            state.timeoutId = null;
            startAnimation();
        }, delay);
        return;
    }

    state.timeoutId = null;
    startAnimation();
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

function updateSliderVisual(value) {
    if (!elements.areaSlider) return;

    const min = parseFloat(elements.areaSlider.min) || 0;
    const max = parseFloat(elements.areaSlider.max) || 100;
    const percentage = ((value - min) / (max - min)) * 100;

    elements.areaSlider.style.setProperty('--slider-progress', `${percentage}%`);
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
        updateSliderVisual(numValue);
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
    if (isResultTransitioning || !elements.leadForm) return;
    if (!elements.leadForm.checkValidity()) {
        elements.leadForm.reportValidity();
        return;
    }

    const submitButton = e.submitter || elements.leadForm.querySelector('button[type="submit"]');
    isResultTransitioning = true;
    setButtonLoadingState(submitButton, true);

    setTimeout(() => {
        isLeadSubmitted = true;
        elements.leadFormSection.classList.add('hidden');
        elements.resultsSection.classList.remove('hidden');

        updateDisplay();
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        setButtonLoadingState(submitButton, false);
        isResultTransitioning = false;
    }, CALCULATION_DELAY_MS);
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

    if (elements.areaDisplay) {
        elements.areaDisplay.textContent = currentInputs.area;
    }
    updateSliderVisual(currentInputs.area);

    initializeCalculator();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
