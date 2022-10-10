import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { jsPDFDocument } from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const colorPalette = {
  treppWhite: '#FFFFFF', // Used for row bg 1
  treppLightGrey: '#EEEEEE', // Used for row bg 2
  treppGrey: '#C5C5C5', // used for subheaders
  treppBlack: '#333333', // use for text
  //Updated
  treppBlue: '#2C5CAA', // Used for Table Title Text
  treppLightBlue: '#F2F8FD'


};

const MAX_TABLE_WIDTH = 592;
const MAX_TABLE_HEIGHT = 730;

async function generatePdf() {
  const pdf: any = new jsPDF('p', 'pt', 'letter');
  const pageWidth = pdf.getPageWidth(); // 612px
  const pageHeight = pdf.getPageHeight(); // 792px;
  const pageDetails = 'Details: One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.) New York-Newark-Jersey City, NY-NJ-PA Office'   //TODO: Make these dynamic in real app
  const address = "One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.)"   //TODO: Make these dynamic in real app
  const pdfHtml = document.querySelector('.pdf-output');
  const tabs: any = Array.from(pdfHtml.querySelectorAll('.tab'));
  const pagesHTML: any = [];
  let currNumPages = 0;
  let currPageNum = 1;
  const pageInfo: any = {};
  // pdf.deletePage(1);



  tabs.forEach((tab: any) => {
    const tabName = tab.classList[0];
    pageInfo[tabName] = {}
    let currPageHeight = 0;
    const heading = tab.querySelector('.tab__title');
    currPageHeight += heading.scrollHeight
    const tablesContainer = tab.querySelector('.tab__tables');
    const tables = Array.from(tablesContainer.querySelectorAll('.tab__table'));
    const formattedTabTables: any = [];




    tables.forEach((tableWrapper: any) => {
      let html: string | string[] = tableWrapper.outerHTML;
      const tableContainer = tableWrapper.querySelector('.trepp__tableContainer');
      const tableTitle = tableContainer.querySelector('.trepp__tableHeader');
      const table: HTMLTableElement = tableContainer.querySelector('.trepp__table');
      const tableHead = table.tHead;
      let tableBody: any = table.tBodies[0];
      const tableRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
      const totalTableHeight = (tableRows.reduce((totalRowHeightSum, rowElement) => rowElement.scrollHeight + totalRowHeightSum, 0)) + tableHead.scrollHeight + tableTitle.scrollHeight;
      if (totalTableHeight > MAX_TABLE_HEIGHT) {
        const tableWrapperClone = tableWrapper.cloneNode();
        const splitTablesRows: HTMLTableRowElement[][] = [];
        let tHeadHeightBuffer = tableTitle.scrollHeight + tableHead.scrollHeight;
        let currHeight = tHeadHeightBuffer;
        let spliceIdx = -1;
        for (let rowIdx in tableRows) {
          if (currHeight + tableRows[rowIdx].scrollHeight > MAX_TABLE_HEIGHT) {
            currHeight = tHeadHeightBuffer;
            break;
          }
          currHeight += tableRows[rowIdx].scrollHeight;
          spliceIdx = Number(rowIdx);
        }
        const rowsToSplit = tableRows.splice(spliceIdx);
        let currSplitTable: any = [];
        for (let rowIdx in rowsToSplit) {
          if ((currHeight + rowsToSplit[rowIdx].scrollHeight) < MAX_TABLE_HEIGHT) {
            currHeight += rowsToSplit[rowIdx].scrollHeight;
            currSplitTable.push(rowsToSplit[rowIdx]);
          } else {

            splitTablesRows.push(currSplitTable);
            currSplitTable = [rowsToSplit[rowIdx]];
            currHeight = tHeadHeightBuffer;
          }
        }
        if (currSplitTable.length) {
          splitTablesRows.push(currSplitTable);
        }
        const tableBodyShell: HTMLElement = tableBody.cloneNode();
        const splitTableWrappers = [tableRows, ...splitTablesRows].map((splitTableRows, tableIdx) => {
          tableBodyShell.innerHTML = splitTableRows.map(row => row.outerHTML.trim()).join('').trim();
          return (`<div class='${tableWrapper.className}'>
            <div class='trepp__tableContainer'>
              <div class='trepp__tableHeader'>
                ${tableTitle.innerText}${tableIdx > 0 ? ' (cont.)' : ''}
              </div>
              <table class='trepp__table' role='table'>
                  ${tableHead.outerHTML}
                  ${tableBodyShell.outerHTML}
              </table>
            </div>
        </div>`);
        });
        html = splitTableWrappers;
        // tableBody.outerHTML = splitTableWrappers.map((wrapper: any) => wrapper.outerHTML).join('').trim();

      }//Vertical Single Table Overflow



      if (Array.isArray(html)) {
        formattedTabTables.push(...html);
      } else {
        formattedTabTables.push(html)
      }

    })
    console.log('formattedTabTables', formattedTabTables)

    //X Overflow X
    let currTableFinalX = null;
    let newTabPageTables = [];
    let currTabPageTables = [];
    const updatedTables = tab.querySelectorAll('.tab__table')
    console.log('updatedTables', updatedTables)
    // console.log('formattedTabTables', formattedTabTables)
    // formattedTabTables.forEach((table: any) => {

    //   // console.log('tableBoundaries', tableBoundaries);
    // })

    const pageHTML = `
        <div class='${tabName} tab'>
          <div class='tab__header'>
            <div class='details'>
                <div class='details-left'>
                  ${pageDetails}
                </div>
                <div class='details-right' >
                  pg.${currPageNum}
                </div>
            </div>
            <div class='address'>
              ${address}
            </div>
          </div>
        ${heading.outerHTML}
        <div class='tab__tables'>
          ${formattedTabTables.join('')}
        </div>
        </div>`
    tab.outerHTML = pageHTML;
    pagesHTML.push(pageHTML);
  })
  if (pdf.getNumberOfPages() < 1) {
    pdf.addPage();
    pdf.setPage(1);
  }
  for (let pageHTML of pagesHTML) {
    await pdf.html(pageHTML, {
      callback(pdf: any) {
        console.log('pdf.getNumberOfPages()', pdf.getNumberOfPages())
      },
      autoPaging: false,
      width: pageWidth,
      windowWidth: pageWidth,
      html2canvas: {
        height: pageHeight - 1,
        windowHeight: pageHeight,
      }
    })
  }
  ((document as any).getElementById('output').data = pdf.output('datauristring'));
}



generatePdf();




