import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportItineraryToPDF = async (tripName: string, destination: string, itineraryItems: any[]) => {
  const element = document.getElementById('itinerary-print-area');
  if (!element) {
    console.error("Print area not found");
    return;
  }

  try {
    // Use html2canvas to capture the DOM element as an image
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Allow cross-origin images if any
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Initialize jsPDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add subsequent pages if content overflows
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(`${tripName.replace(/\s+/g, '_')}_Itinerary.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF. Please try again.");
  }
};