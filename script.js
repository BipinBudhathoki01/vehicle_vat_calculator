// --- Constants and Data ---

// Tax rates (Base Tax)
const TAX_RATES = {
    'two-wheeler-petrol': [
        { range: [0, 125], rate: 3000 },
        { range: [126, 150], rate: 5000 },
        { range: [151, 225], rate: 6500 },
        { range: [226, 400], rate: 12000 },
        { range: [401, 650], rate: 25000 },
        { range: [651, Infinity], rate: 35000 }
    ],
    'four-wheeler-petrol': [
        { range: [0, 1000], rate: 22000 },
        { range: [1001, 1500], rate: 25000 },
        { range: [1501, 2000], rate: 27000 },
        { range: [2001, 2500], rate: 37000 },
        { range: [2501, 3000], rate: 50000 },
        { range: [3001, 3500], rate: 65000 },
        { range: [3501, Infinity], rate: 70000 }
    ],
    'two-wheeler-electric': [
        { range: [0, 50], rate: 1000 }, // Assuming Watts (W)
        { range: [51, 350], rate: 1500 },
        { range: [351, 1000], rate: 2000 },
        { range: [1001, 1500], rate: 2500 },
        { range: [1501, Infinity], rate: 3000 }
    ],
    'four-wheeler-electric': [
        { range: [0, 10], rate: 5000 }, // Assuming KW
        { range: [11, 50], rate: 5000 }, // Combine 0-10 and 10-50? The rule says 10KW to 50KW. Let's adjust ranges.
        { range: [10, 50], rate: 5000 }, // Correcting ranges based on rules
        { range: [51, 125], rate: 15000 },
        { range: [126, 200], rate: 20000 },
        { range: [201, Infinity], rate: 30000 }
    ]
};

// Annual Renewal Charges (for Petrol only)
const RENEWAL_CHARGE_ANNUAL = {
    'two-wheeler-petrol': 300,
    'four-wheeler-petrol': 500,
    'two-wheeler-electric': 0, // No separate charge mentioned
    'four-wheeler-electric': 0  // No separate charge mentioned
};

// Third Party Insurance Rates
const INSURANCE_RATES = {
    'two-wheeler-petrol': [
        { range: [0, 149], rate: 1715 },
        { range: [150, 250], rate: 1941 },
        { range: [251, Infinity], rate: 2167 }
    ],
    'two-wheeler-electric': [
        { range: [0, 800], rate: 1715 }, // Assuming Watts for range
        { range: [801, 1200], rate: 1945 },
        { range: [1201, Infinity], rate: 2167 }
    ],
    'four-wheeler-petrol': [
        { range: [0, 1000], rate: 7365 },
        { range: [1001, 1600], rate: 8495 },
        { range: [1601, Infinity], rate: 10747 }
    ],
    'four-wheeler-electric': [
        { range: [0, 20], rate: 7365 }, // Assuming KW for range
        { range: [21, Infinity], rate: 8495 }
    ]
};

// Fine Percentages and thresholds (Simplified based on FY/Month)
const FINE_RATES = {
    WITHIN_FIRST_OVERDUE_FY_SHRAWAN: 0.05, // Paid in Shrawan
    WITHIN_FIRST_OVERDUE_FY_BHADRA: 0.10,  // Paid in Bhadra
    WITHIN_FIRST_OVERDUE_FY_AFTER_BHADRA: 0.20, // Paid after Bhadra but within first overdue FY
    AFTER_FIRST_OVERDUE_FY_ANNUAL: 0.32 // Paid in second or later overdue FY (per year)
};

const RENEWAL_FINE_PERCENTAGE = 1; // 100% fine on renewal charge if applicable

// Fiscal Year Discount Range (BS Start Years)
const DISCOUNT_FY_START_MIN = 2072;
const DISCOUNT_FY_START_MAX = 2079;
const DISCOUNT_PERCENTAGE = 0.16; // 16% discount on fine

// --- DOM Elements ---
const vehicleTypeSelect = document.getElementById('vehicleType');
const manufactureYearSelect = document.getElementById('manufactureYear');
const capacityLabel = document.getElementById('capacityLabel');
const engineCapacityInput = document.getElementById('engineCapacity');
const lastRenewDateInput = document.getElementById('lastRenewDate');
const currentRenewDateInput = document.getElementById('currentRenewDate');
const insuranceCheckbox = document.getElementById('thirdPartyInsurance');
const applyDiscountCheckbox = document.getElementById('applyDiscount');
const calculateButton = document.getElementById('calculateBtn');
const errorMessageDiv = document.getElementById('errorMessage');
const resultsDiv = document.getElementById('results');
const baseTaxResultSpan = document.getElementById('baseTaxResult');
const renewalChargesResultSpan = document.getElementById('renewalChargesResult');
const fineResultSpan = document.getElementById('fineResult');
const insuranceItemDiv = document.getElementById('insuranceItem');
const insuranceResultSpan = document.getElementById('insuranceResult');
const totalResultSpan = document.getElementById('totalResult');

// --- Helper Functions ---

// Populates the year dropdown (AD)
function populateManufactureYears() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1985; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + " A.D.";
        manufactureYearSelect.appendChild(option);
    }
}

// Updates the capacity input label based on vehicle type
function updateCapacityLabel() {
    const type = vehicleTypeSelect.value;
    if (type.includes('petrol')) {
        capacityLabel.textContent = 'Engine Capacity (CC):';
    } else { // Electric
        if (type === 'two-wheeler-electric') {
             capacityLabel.textContent = 'Engine Capacity (Watts/W):';
        } else { // Four Wheeler Electric
             capacityLabel.textContent = 'Engine Capacity (KW):';
        }
    }
}

// Parses a B.S. date string (YYYY/MM/DD) into { year, month, day }
function parseBsDate(dateString) {
    const parts = dateString.split('/').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
        return { year: parts[0], month: parts[1], day: parts[2] };
    }
    return null; // Invalid format
}

// Checks if a parsed B.S. date is potentially valid (basic check)
function isValidBsDate(date) {
     if (!date) return false;
     // Basic range checks - does not validate day based on month/year
     if (date.year < 1985 || date.year > 2100) return false; // Arbitrary reasonable BS year range
     if (date.month < 1 || date.month > 12) return false;
     if (date.day < 1 || date.day > 32) return false; // Allow up to 32 as month lengths vary
     return true;
}


// Gets the B.S. Fiscal Year (e.g., 2080 for 2080/04/01 - 2081/03/31) from a parsed B.S. date
function getBsFiscalYear(date) {
    if (!date) return null;
    // Fiscal year starts from Shrawan (Month 4)
    return date.month >= 4 ? date.year : date.year - 1;
}

// Checks if a parsed B.S. date is in Shrawan (Month 4) of a specific BS year
function isDateInShrawan(date, bsYear) {
    return date && date.year === bsYear && date.month === 4;
}

// Checks if a parsed B.S. date is in Bhadra (Month 5) of a specific BS year
function isDateInBhadra(date, bsYear) {
    return date && date.year === bsYear && date.month === 5;
}

// Checks if a parsed B.S. date is after Bhadra (Month 5) in a specific BS year (up to Ashadh of next year)
function isDateAfterBhadraInSameFY(date, bsYear) {
     if (!date) return false;
     const fyStartYear = bsYear;
     const fyEndYear = bsYear + 1; // Ashadh is in the next solar year

     // Date must be in the correct fiscal year period (Shrawan FY_Start to Ashadh FY_End)
     const isInFYPeriod = (date.year === fyStartYear && date.month >= 4) ||
                          (date.year === fyEndYear && date.month <= 3);

     if (!isInFYPeriod) return false; // Not in the relevant FY period

     // Check if it's after Bhadra (month 5)
     if (date.year === fyStartYear) {
         return date.month > 5; // After month 5 in the start year
     } else if (date.year === fyEndYear) {
         // Any month (1-3) in the end year is after month 5 of the start year
         return date.month >= 1 && date.month <= 3;
     }
     return false; // Should not reach here if isInFYPeriod is true
}


// Formats a number as Nepali Rupee currency
function formatCurrency(amount) {
    return `Rs. ${amount.toLocaleString('en-NP')}`;
}

// --- Calculation Logic ---

function getBaseTax(vehicleType, capacity) {
    const rates = TAX_RATES[vehicleType];
    if (!rates) return 0;

    for (const rateInfo of rates) {
        if (capacity >= rateInfo.range[0] && capacity <= rateInfo.range[1]) {
            return rateInfo.rate;
        }
    }
    return 0; // Should not happen if ranges are complete
}

function getAnnualRenewalCharge(vehicleType) {
    return RENEWAL_CHARGE_ANNUAL[vehicleType] || 0;
}

function getInsuranceCost(vehicleType, capacity) {
     const rates = INSURANCE_RATES[vehicleType];
     if (!rates) return 0;

     for (const rateInfo of rates) {
        if (capacity >= rateInfo.range[0] && capacity <= rateInfo.range[1]) {
            return rateInfo.rate;
        }
    }
    return 0; // Should not happen if ranges are complete
}

function calculateTax() {
    // Clear previous results and errors
    errorMessageDiv.textContent = '';
    resultsDiv.style.display = 'none';

    // 1. Get Inputs and Validate Dates
    const vehicleType = vehicleTypeSelect.value;
    const manufactureYear = parseInt(manufactureYearSelect.value); // AD year - used for info, not tax calculation
    const engineCapacity = parseFloat(engineCapacityInput.value);
    const lastRenewDateStr = lastRenewDateInput.value.trim();
    const currentRenewDateStr = currentRenewDateInput.value.trim();
    const addInsurance = insuranceCheckbox.checked;
    const applyDiscount = applyDiscountCheckbox.checked;

    if (isNaN(engineCapacity) || engineCapacity < 0) {
        errorMessageDiv.textContent = 'Please enter a valid positive number for Engine Capacity.';
        return;
    }
     if (!lastRenewDateStr || !currentRenewDateStr) {
        errorMessageDiv.textContent = 'Please enter both Last Renew Date and Current Renew Date.';
        return;
     }

    const lastRenewDate = parseBsDate(lastRenewDateStr);
    const currentRenewDate = parseBsDate(currentRenewDateStr);

    if (!isValidBsDate(lastRenewDate) || !isValidBsDate(currentRenewDate)) {
         errorMessageDiv.textContent = 'Invalid date format. Please use YYYY/MM/DD for B.S. dates.';
         return;
    }
     if (currentRenewDate.year < lastRenewDate.year ||
        (currentRenewDate.year === lastRenewDate.year && currentRenewDate.month < lastRenewDate.month) ||
        (currentRenewDate.year === lastRenewDate.year && currentRenewDate.month === lastRenewDate.month && currentRenewDate.day < lastRenewDate.day)) {
         // Allow same day renewal, but not prior dates
         if (!(currentRenewDate.year === lastRenewDate.year && currentRenewDate.month === lastRenewDate.month && currentRenewDate.day === lastRenewDate.day)) {
             errorMessageDiv.textContent = 'Current Renew Date cannot be before Last Renew Date.';
             return;
         }
     }


    // 2. Calculate Base Tax
    const baseTaxAnnual = getBaseTax(vehicleType, engineCapacity);
    const annualRenewalCharge = getAnnualRenewalCharge(vehicleType);

    // 3. Determine Fiscal Years and Years Due
    const lastPaidFY = getBsFiscalYear(lastRenewDate);
    const currentPayingFY = getBsFiscalYear(currentRenewDate);

    let yearsDue = currentPayingFY - lastPaidFY;

    // If current date is in the same FY as last paid, only 1 year is due (the current one)
    // If current date is BEFORE last paid FY (error handled above), result is likely 0 or error
    if (yearsDue <= 0) {
       yearsDue = 1;
    }

    const overdueYears = Math.max(0, yearsDue - 1);

    const totalBaseTax = baseTaxAnnual * yearsDue;
    let totalRenewalCharge = annualRenewalCharge * overdueYears;


    // 4. Calculate Fine (Based on Simplified FY/Month Logic)
    let fineAmount = 0;
    const firstOverdueFY = lastPaidFY + 1; // The fiscal year tax was first due

    // Check which fiscal year the payment is made in relative to when it was first due
    if (currentPayingFY === firstOverdueFY) {
        // Payment made in the first fiscal year tax was overdue
        // Determine fine based on month in this FY (simplified day logic)
        if (isDateInShrawan(currentRenewDate, firstOverdueFY)) {
             fineAmount = baseTaxAnnual * FINE_RATES.WITHIN_FIRST_OVERDUE_FY_SHRAWAN;
        } else if (isDateInBhadra(currentRenewDate, firstOverdueFY)) {
             fineAmount = baseTaxAnnual * FINE_RATES.WITHIN_FIRST_OVERDUE_FY_BHADRA;
        } else if (isDateAfterBhadraInSameFY(currentRenewDate, firstOverdueFY)) {
             fineAmount = baseTaxAnnual * FINE_RATES.WITHIN_FIRST_OVERDUE_FY_AFTER_BHADRA;
        }
        // Note: If currentRenewDate is before Shrawan 1 of firstOverdueFY, fineAmount remains 0 here.
        // This is correct as delay is calculated from Shrawan 1 of first overdue FY.

    } else if (currentPayingFY > firstOverdueFY) {
        // Payment made in a fiscal year later than the first overdue one
        // Apply 32% fine on base tax for ALL years due
        fineAmount = baseTaxAnnual * FINE_RATES.AFTER_FIRST_OVERDUE_FY_ANNUAL * yearsDue;
    }
    // else if currentPayingFY < firstOverdueFY: No fine, handled by yearsDue <= 0 case.


    // Apply 100% fine on Renewal Charge if payment is significantly late (simplified to be after Bhadra or in later FY)
     const isSignificantlyLateForRenewalFine =
        (currentPayingFY === firstOverdueFY && isDateAfterBhadraInSameFY(currentRenewDate, firstOverdueFY)) ||
        currentPayingFY > firstOverdueFY;

    if (isSignificantlyLateForRenewalFine) {
        totalRenewalCharge += totalRenewalCharge * RENEWAL_FINE_PERCENTAGE; // Add 100% of the charge
    }


    // 5. Apply 16% Optional Discount on Fine
    let discountAmount = 0;
    if (applyDiscount) {
         // Check if any year being paid for is within the discount range
         const firstYearToPay = lastPaidFY + 1; // FY after the last paid one
         const lastYearToPay = currentPayingFY; // The current FY being paid for

         const hasEligibleYears = Math.max(firstYearToPay, DISCOUNT_FY_START_MIN) <= Math.min(lastYearToPay, DISCOUNT_FY_START_MAX);

         if (hasEligibleYears) {
              discountAmount = fineAmount * DISCOUNT_PERCENTAGE;
              fineAmount -= discountAmount;
              fineAmount = Math.max(0, fineAmount); // Ensure fine doesn't go negative
         }
    }


    // 6. Calculate Insurance Cost
    const insuranceCost = addInsurance ? getInsuranceCost(vehicleType, engineCapacity) : 0;


    // 7. Calculate Total
    const totalPayable = totalBaseTax + totalRenewalCharge + fineAmount + insuranceCost;


    // 8. Display Results
    baseTaxResultSpan.textContent = formatCurrency(totalBaseTax);
    renewalChargesResultSpan.textContent = formatCurrency(totalRenewalCharge);
    fineResultSpan.textContent = formatCurrency(fineAmount);

    if (addInsurance) {
        insuranceItemDiv.style.display = 'flex';
        insuranceResultSpan.textContent = formatCurrency(insuranceCost);
    } else {
        insuranceItemDiv.style.display = 'none';
    }

    totalResultSpan.textContent = formatCurrency(totalPayable);

    resultsDiv.style.display = 'block';
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    populateManufactureYears();
    updateCapacityLabel(); // Set initial label
});

vehicleTypeSelect.addEventListener('change', updateCapacityLabel);
calculateButton.addEventListener('click', calculateTax);


// --- Initialization ---
// Run initial population and label update on page load
populateManufactureYears();
updateCapacityLabel();