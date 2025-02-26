export const formatDateSmall = (date) => {
  const day = String(date.getDate()).padStart(2, "0"); // Get day and pad with zero if needed
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are zero-based
  const year = date.getFullYear(); // Get the full year

  return `${day}/${month}/${year}`;
};
