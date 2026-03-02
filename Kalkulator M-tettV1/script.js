const BASE_CASE_LOOKUP = {
    2: { cost: 299000, days: 25 }, 3: { cost: 312000, days: 25 }, 4: { cost: 322000, days: 25 },
    5: { cost: 338000, days: 25 }, 6: { cost: 353000, days: 25 }, 7: { cost: 368000, days: 25 },
    8: { cost: 378000, days: 25 }, 9: { cost: 398000, days: 25 }, 10: { cost: 413000, days: 25 },
    11: { cost: 428000, days: 30 }, 12: { cost: 443000, days: 30 }, 13: { cost: 443000, days: 30 },
    14: { cost: 453000, days: 30 }, 15: { cost: 453000, days: 30 }, 16: { cost: 463000, days: 30 },
    17: { cost: 463000, days: 30 }, 18: { cost: 473000, days: 30 }, 19: { cost: 483000, days: 30 },
    20: { cost: 493000, days: 30 }, 21: { cost: 503000, days: 30 }, 22: { cost: 513000, days: 30 },
    23: { cost: 523000, days: 30 }, 24: { cost: 533000, days: 30 }, 25: { cost: 543000, days: 30 }
};

const M_TETT_CASES = [
    { value: 'Slukrep', label: 'Sluk', type: 'fixed', data: { CO2e: 41.847333005119644, COST: 35000, DAYS: 3 } },
    {
        value: 'Gulv',
        label: 'Gulv',
        type: 'wholeFloor',
        data: { co2Intercept: 433.3611050593396, co2SlopePerSqm: 132.72314915677674, COST: 130000, DAYS: 7 }
    },
    { value: 'Sisterne', label: 'Sisterne', type: 'fixed', data: { CO2e: 233.74103626466453, COST: 65000, DAYS: 5 } },
    { value: 'Terskel', label: 'Terskel', type: 'fixed', data: { CO2e: 50.451139066157886, COST: 15000, DAYS: 2 } },
    { value: 'Dusjnisje', label: 'Dusjnisje', type: 'fixed', data: { CO2e: 664.2903186439871, COST: 120000, DAYS: 5 } },
    {
        value: 'Flisrep',
        label: 'Skadet flis',
        type: 'wall',
        data: { co2Intercept: 36.9111999434392, co2SlopePerSqm: 114.6148000094268, COST: 90000, DAYS: 7 }
    }
];

const CALCULATION_DELAY_MS = 1000;
const CALCULATING_LABEL = 'Kalkulerer...';

let currentInputs = {
    area: 6,
    damage: ''
};
let isLeadSubmitted = false;
let isResultTransitioning = false;

const metricAnimationState = {
    co2: { value: 0, rafId: null, timeoutId: null },
    cost: { value: 0, rafId: null, timeoutId: null },
    time: { value: 0, rafId: null, timeoutId: null }
};
let metricAnimationSequence = 0;
let elements = {};

function normalizeAreaForLookup(area) {
    return Math.min(25, Math.max(2, Math.round(area)));
}

function formatInteger(value) {
    return new Intl.NumberFormat('nb-NO', {
        maximumFractionDigits: 0
    }).format(value);
}

function formatDays(value) {
    const isWhole = Number.isInteger(value);
    return new Intl.NumberFormat('nb-NO', {
        minimumFractionDigits: isWhole ? 0 : 1,
        maximumFractionDigits: isWhole ? 0 : 1
    }).format(value);
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

function updateSliderVisual(value) {
    if (!elements.areaSlider) return;

    const min = parseFloat(elements.areaSlider.min) || 0;
    const max = parseFloat(elements.areaSlider.max) || 100;
    const percentage = ((value - min) / (max - min)) * 100;

    elements.areaSlider.style.setProperty('--slider-progress', `${percentage}%`);
}

function calculateMtetEstimate(area, caseItem) {
    if (!caseItem) return null;

    if (caseItem.type === 'wholeFloor' || caseItem.type === 'wall') {
        return {
            co2e: caseItem.data.co2Intercept + (caseItem.data.co2SlopePerSqm * area),
            cost: caseItem.data.COST,
            days: caseItem.data.DAYS
        };
    }

    return {
        co2e: caseItem.data.CO2e,
        cost: caseItem.data.COST,
        days: caseItem.data.DAYS
    };
}

function calculateSavings(area, selectedDamage) {
    const caseItem = M_TETT_CASES.find((item) => item.value === selectedDamage);
    if (!caseItem) return null;

    const areaKey = normalizeAreaForLookup(area);
    const baseLookup = BASE_CASE_LOOKUP[areaKey];

    const base = {
        co2e: 425.75 + (232.5 * area),
        cost: baseLookup.cost,
        days: baseLookup.days
    };

    const mTett = calculateMtetEstimate(area, caseItem);

    return {
        area,
        areaKey,
        damageLabel: caseItem.label,
        base,
        mTett,
        saved: {
            co2e: Math.max(base.co2e - mTett.co2e, 0),
            cost: Math.max(base.cost - mTett.cost, 0),
            days: Math.max(base.days - mTett.days, 0)
        }
    };
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
            const currentValue = from + (target - from) * easeOutCubic(progress);

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

function animateMetricsSequential(savedCo2, savedCost, savedTime) {
    metricAnimationSequence += 1;
    const sequenceId = metricAnimationSequence;

    animateMetricValue('co2', elements.savedCo2Value, savedCo2, (value) => formatInteger(Math.round(value)), 700, 0, sequenceId);
    animateMetricValue('cost', elements.savedCostValue, savedCost, (value) => formatInteger(Math.round(value)), 800, 300, sequenceId);
    animateMetricValue('time', elements.savedTimeValue, savedTime, (value) => formatDays(Math.round(value)), 900, 620, sequenceId);
}

function animateResultCards() {
    const resultCards = document.querySelectorAll('.metrikk-card, .comparison-card');
    resultCards.forEach((card, index) => {
        card.style.animation = 'none';
        setTimeout(() => {
            card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.08}s backwards`;
        }, 10);
    });
}

function setComparisonValues(result) {
    elements.co2BaseValue.textContent = formatInteger(Math.round(result.base.co2e));
    elements.co2MtetValue.textContent = formatInteger(Math.round(result.mTett.co2e));
    elements.co2SavedValue.textContent = formatInteger(Math.round(result.saved.co2e));

    elements.costBaseValue.textContent = formatInteger(Math.round(result.base.cost));
    elements.costMtetValue.textContent = formatInteger(Math.round(result.mTett.cost));
    elements.costSavedValue.textContent = formatInteger(Math.round(result.saved.cost));

    elements.timeBaseValue.textContent = formatDays(result.base.days);
    elements.timeMtetValue.textContent = formatDays(result.mTett.days);
    elements.timeSavedValue.textContent = formatDays(Math.round(result.saved.days));
}

function updateDisplay() {
    if (!isLeadSubmitted) return;

    const result = calculateSavings(currentInputs.area, currentInputs.damage);
    if (!result) return;

    elements.resultArea.textContent = `${formatInteger(result.area)} m²`;
    elements.resultDamage.textContent = result.damageLabel;

    animateMetricsSequential(
        Math.round(result.saved.co2e),
        Math.round(result.saved.cost),
        Math.round(result.saved.days)
    );

    setComparisonValues(result);
    animateResultCards();
}

function selectDamage(value) {
    const selectedCase = M_TETT_CASES.find((item) => item.value === value);
    if (!selectedCase) return;

    currentInputs.damage = selectedCase.value;

    document.querySelectorAll('.damage-btn').forEach((btn) => {
        const isActive = btn.dataset.value === selectedCase.value;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (elements.selectedDamageText) {
        elements.selectedDamageText.textContent = selectedCase.label;
    }

    if (elements.step1Error) {
        elements.step1Error.classList.add('hidden');
    }
}

function populateDamageButtons() {
    if (!elements.damageGrid) return;

    elements.damageGrid.innerHTML = '';

    M_TETT_CASES.forEach((caseItem) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'damage-btn';
        button.textContent = caseItem.label;
        button.dataset.value = caseItem.value;
        button.setAttribute('aria-pressed', 'false');

        button.addEventListener('click', () => {
            selectDamage(caseItem.value);
            if (isLeadSubmitted) {
                updateDisplay();
            }
        });

        elements.damageGrid.appendChild(button);
    });
}

function handleAreaChange(value) {
    const numValue = parseFloat(value);

    if (Number.isNaN(numValue) || numValue < 2 || numValue > 25) return;

    currentInputs.area = numValue;

    if (elements.areaDisplay) {
        elements.areaDisplay.textContent = formatInteger(numValue);
    }

    if (elements.areaSlider) {
        elements.areaSlider.value = numValue;
    }

    updateSliderVisual(numValue);

    if (isLeadSubmitted) {
        updateDisplay();
    }
}

function handleNextStep() {
    if (isResultTransitioning) return;

    if (!currentInputs.damage) {
        if (elements.step1Error) {
            elements.step1Error.classList.remove('hidden');
        }
        return;
    }

    elements.inputSection.classList.add('hidden');
    elements.leadFormSection.classList.remove('hidden');
    elements.leadFormSection.scrollIntoView({ behavior: 'smooth' });
}

function handleLeadSubmit(event) {
    event.preventDefault();

    if (isResultTransitioning || !elements.leadForm) return;

    if (!elements.leadForm.checkValidity()) {
        elements.leadForm.reportValidity();
        return;
    }

    const submitButton = event.submitter || elements.submitBtn || elements.leadForm.querySelector('button[type="submit"]');

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

function initializeCalculator() {
    if (elements.areaSlider) {
        elements.areaSlider.addEventListener('input', (event) => {
            handleAreaChange(event.target.value);
        });
    }

    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', handleNextStep);
    }

    if (elements.leadForm) {
        elements.leadForm.addEventListener('submit', handleLeadSubmit);
    }

    populateDamageButtons();
}

function init() {
    elements = {
        areaSlider: document.getElementById('areaSlider'),
        areaDisplay: document.getElementById('areaDisplay'),
        damageGrid: document.getElementById('damageGrid'),
        selectedDamageText: document.getElementById('selectedDamageText'),
        step1Error: document.getElementById('step1Error'),
        nextBtn: document.getElementById('nextBtn'),
        inputSection: document.getElementById('inputSection'),
        leadFormSection: document.getElementById('leadFormSection'),
        leadForm: document.getElementById('leadForm'),
        submitBtn: document.getElementById('submitBtn'),
        resultsSection: document.getElementById('resultsSection'),
        resultArea: document.getElementById('resultArea'),
        resultDamage: document.getElementById('resultDamage'),
        savedCo2Value: document.getElementById('savedCo2Value'),
        savedCostValue: document.getElementById('savedCostValue'),
        savedTimeValue: document.getElementById('savedTimeValue'),
        co2BaseValue: document.getElementById('co2BaseValue'),
        co2MtetValue: document.getElementById('co2MtetValue'),
        co2SavedValue: document.getElementById('co2SavedValue'),
        costBaseValue: document.getElementById('costBaseValue'),
        costMtetValue: document.getElementById('costMtetValue'),
        costSavedValue: document.getElementById('costSavedValue'),
        timeBaseValue: document.getElementById('timeBaseValue'),
        timeMtetValue: document.getElementById('timeMtetValue'),
        timeSavedValue: document.getElementById('timeSavedValue')
    };

    currentInputs = {
        area: elements.areaSlider ? parseFloat(elements.areaSlider.value) : 6,
        damage: ''
    };

    if (elements.areaDisplay) {
        elements.areaDisplay.textContent = formatInteger(currentInputs.area);
    }

    updateSliderVisual(currentInputs.area);
    initializeCalculator();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
