// frontend/src/utils/dateFormatter.ts

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return ''; // Return empty string if undefined/null
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch (e) {
    return '';
  }
};
