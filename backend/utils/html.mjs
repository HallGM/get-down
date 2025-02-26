// Function to generate an HTML table from objects
export function generateHTMLTable(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return "<table><tr><td>No data available</td></tr></table>";
  }
  let html = "<table border='1'>";
  const headers = Object.keys(data[0]);
  html += "<thead><tr>";
  headers.forEach((header) => {
    html += `<th>${header}</th>`;
  });
  html += "</tr></thead>";

  // Generate rows
  html += "<tbody>";
  data.forEach((row) => {
    html += "<tr>";
    headers.forEach((header) => {
      html += `<td>${row[header]}</td>`;
    });
    html += "</tr>";
  });
  html += "</tbody>";
  html += "</table>";

  return html;
}
