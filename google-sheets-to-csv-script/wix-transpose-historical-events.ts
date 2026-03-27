/**
 * Extracts concert purchase data from Sheet1 into a new long-format list,
 * parsing text into proper Date objects, including extra attendee info,
 * and categorizing the concert type.
 */
function extractConcertPurchasesWithDatesInfoAndType() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName("FlatNamesNotOnWix");
    const destSheetName = "Ticket Purchases (Full)";
    let destSheet = ss.getSheetByName(destSheetName);

    if (!destSheet) {
        destSheet = ss.insertSheet(destSheetName);
    } else {
        destSheet.clear();
    }

    const data = sourceSheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];

    // Updated headers to include the two new columns at the end
    const output = [[
        "Surname", "First name", "Other names", "Email address", "Group",
        "Source", "Status", "Concert", "Concert Type", "Purchase Text", "Ticket Count", "Purchase Date", "isHistoricalOrder", "wixOrderNumber"
    ]];

    // Concert columns start at index 9 (Column J) and repeat every 2 columns
    const startColIndex = 9;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];

        // Extract attendee info
        const surname = row[0];
        const firstName = row[1];
        const otherNames = row[2];
        const email = row[3];
        const group = row[4];
        const source = row[5];
        const status = row[6];

        // Skip empty rows
        if (!surname && !firstName) continue;

        for (let col = startColIndex; col < headers.length; col += 2) {
            const concertName = headers[col];
            const purchaseText = row[col];
            const ticketCount = row[col + 1]; // Ticket count is 2 columns over

            // If there is any purchase text or a ticket count, record the entry
            if (purchaseText || ticketCount) {
                let purchaseDate = "";

                if (purchaseText && typeof purchaseText === 'string') {
                    purchaseDate = parsePurchaseDate(purchaseText, concertName);
                }

                // Fallback: If no valid date in Purchase Text, use the Concert Date
                if (!purchaseDate || purchaseDate === "") {
                    purchaseDate = extractConcertDate(concertName);
                }

                // Determine Concert Type
                let concertType = "OTHER";
                const upperConcert = String(concertName).toUpperCase();

                if (upperConcert.includes("RCM") || upperConcert.includes("RAM")) {
                    concertType = "RCM or RAM";
                } else if (extractConcertDate(concertName) !== "") {
                    // If the concert name contains a valid date format, it's Professional
                    concertType = "PROFESSIONAL";
                }

                // Push all the info into the output array, including the new values
                output.push([
                    surname, firstName, otherNames, email, group,
                    source, status, concertName, concertType, purchaseText, ticketCount, purchaseDate, true, ""
                ]);
            }
        }
    }

    // Write the output to the new sheet
    if (output.length > 1) {
        const range = destSheet.getRange(1, 1, output.length, output[0].length);
        range.setValues(output);

        // Format headers
        destSheet.getRange(1, 1, 1, output[0].length).setFontWeight("bold");

        // Format the Purchase Date column (Now Column L / 12) as proper dates
        destSheet.getRange(2, 12, output.length - 1, 1).setNumberFormat("yyyy-MM-dd");

        destSheet.autoResizeColumns(1, output[0].length);
    }
}

/**
 * Helper: Parses the purchase text to find a date and infers the year from the concert name.
 */
function parsePurchaseDate(purchaseText, concertName) {
    // Matches "23Feb", "4/Jan", "12/12", etc.
    let pMatch = purchaseText.match(/(\d{1,2})[\/\s]*([a-zA-Z]{3,}|[0-9]{1,2})/);
    if (!pMatch) return "";

    let pDay = parseInt(pMatch[1], 10);
    let pMonth = getMonthIndex(pMatch[2]);
    if (pMonth === null) return "";

    // Extract year and month from the concert name
    let cMatch = String(concertName).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]{3,})\s+(20\d{2})/i);
    let year = new Date().getFullYear(); // Default to current year
    let cMonth = -1;

    if (cMatch) {
        year = parseInt(cMatch[3], 10);
        cMonth = getMonthIndex(cMatch[2]);
    } else {
        // Just try to find a year if standard format fails
        let yMatch = String(concertName).match(/\b(20\d{2})\b/);
        if (yMatch) year = parseInt(yMatch[1], 10);
    }

    // Logic adjustment: If bought in late year (e.g., Nov) for an early year concert (e.g., Feb)
    if (cMonth !== -1 && pMonth > cMonth + 2) {
        year -= 1;
    }

    return new Date(year, pMonth, pDay);
}

/**
 * Helper: Extracts a standard date object directly from the concert name.
 */
function extractConcertDate(concertName) {
    let match = String(concertName).match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]{3,})\s+(20\d{2})/i);
    if (match) {
        let day = parseInt(match[1], 10);
        let month = getMonthIndex(match[2]);
        let year = parseInt(match[3], 10);
        if (month !== null) {
            return new Date(year, month, day);
        }
    }
    return "";
}

/**
 * Helper: Converts month strings (e.g., "Jan", "01") into 0-indexed numbers for JS Dates.
 */
function getMonthIndex(monthStr) {
    if (/^\d+$/.test(monthStr)) {
        let m = parseInt(monthStr, 10) - 1;
        return (m >= 0 && m <= 11) ? m : null;
    }
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let mStr = monthStr.toLowerCase().substring(0, 3);
    let idx = months.indexOf(mStr);
    return idx !== -1 ? idx : null;
}