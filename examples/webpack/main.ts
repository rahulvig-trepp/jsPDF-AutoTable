import jsPDF, { jsPDFAPI } from 'jspdf';
import 'jspdf-autotable';
import { jsPDFDocument } from 'jspdf-autotable';


import { pdfData } from './mockData';
import html2canvas from 'html2canvas';
// To bring into TWL ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Types
export type AutoTableWidthSetting = 'half' | 'full';

// constants
const colorPalette = {
  treppBlue: '#2C5CAA', // Used for Table Title Text
  treppWhite: '#FFFFFF', // Used for row bg 1
  treppLightGrey: '#EEEEEE', // Used for row bg 2
  treppGrey: '#C5C5C5', // used for subheaders
  treppBlack: '#333333' // use for text
};
const constants = {
  xBoundary: 602,
  yBoundary: 782,
};

async function generatePdf() {
  const pdf: any = new jsPDF('p', 'pt', 'letter');
  const pageWidth = pdf.getPageWidth();
  const pageHeight = pdf.getPageHeight();
  const tabs: any = document.getElementsByClassName('tab');
  const pagesHTML: any = [];
  let currNumPages = 0;

  for (let tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
    const tabHeading = tabs[tabIdx].getElementsByClassName('tab-header')[0].innerText;
    const tabName = tabHeading.split(' ').join('_');
    const tabTables = tabs[tabIdx].getElementsByClassName('trepp__tableContainer');

    // Dynamically restructure HTML if there is X (horizontal) overflow, so that tables that overflow on the X-axis can go to next page.
    const tabTablesPerPage: any = [];
    const prevPageNum = tabIdx > 0 ? currNumPages : 0
    Array.from(tabTables).forEach((table: any) => {
      // For the tableHeight handle it here, this is overflow Y
      const boundaries = table.getBoundingClientRect();
      let currTabPage = Math.floor(boundaries.right / constants.xBoundary);
      if (!tabTablesPerPage[currTabPage]) {
        tabTablesPerPage[currTabPage] = {
          pageNum: prevPageNum + currTabPage + 1,
          tables: []
        }
        currNumPages++;
      }
      tabTablesPerPage[currTabPage].tables.push(table);
    });

    console.log('tabTablesPerPage', tabTablesPerPage)

    // TODO: Detect Y Overflow - Need to check width of table to see if it has room to wrap (Similar idea as X Overflow above)-
    //    Check Table Height and see how many pages it needs to span and decide how to cut off the last rows and insert into new table


    //temp
    const pageDetails = 'Details: One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.) New York-Newark-Jersey City, NY-NJ-PA Office'
    const address = "One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.) "


    tabTablesPerPage.forEach((tabPageTables: HTMLCollection, tabPageIdx: any) => {
      const { pageNum, tables }: any = tabPageTables;
      const formattedHeader = tabPageIdx > 0 ? `${tabHeading} (cont.)` : tabHeading;
      // TODO: Externalize all styles
      pagesHTML.push(`
        <div class='${tabName} tab-pg pg-${pageNum}'>
          <div class='header'>
            <div class='header__details' style='width: 100%; font-size: 8px; color: grey; display: flex; justify-content: space-between;'>
              <div class='header__details-left'>
                  ${pageDetails}                                                                       
              </div>              
              <div class='header__details'>
                  pg. ${pageNum}                                                                       
              </div>
            </div>
            <h3>${address}</h3>
          </div>
          <div class='heading'> 
            ${formattedHeader}
          </div>
          <div class='tables'>
            ${Array.from(tables).reduce((htmlStr: string, table: HTMLElement) => `${htmlStr}\n${table.outerHTML}`, '')}
          </div>
        </div>
      `)
    })
  }




  for (let pageHTML of pagesHTML) {
    await pdf.html(pageHTML, {
      autoPaging: false,
      width: pageWidth,
      windowWidth: pageWidth,
    })
    pdf.addPage();
  }
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  ((document as any).getElementById('output').data = pdf.output('datauristring'));















































  // debugger;
}



generatePdf();




