/**
 * Utility functions for exporting data to CSV.
 */

export function downloadCSV(data, filename = 'export.csv') {
    if (!data || !data.length) {
        console.warn("No data to export");
        return;
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Build the CSV string
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add headers row

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + (row[header] ?? '')).replace(/"/g, '\\"');
            return `"${escaped}"`; // Enclose in quotes to handle commas within values
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
