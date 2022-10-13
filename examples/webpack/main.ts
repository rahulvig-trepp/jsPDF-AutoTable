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

const getSplicedRows = (tableBodyRows: HTMLTableRowElement[], boundary: number, max: number = 650) => {
  const spliceIdxs = [];
  let rowIdx = 0;
  let currRowHeight = 0;
  while (rowIdx < tableBodyRows.length) {
    const { bottom: rowBottom } = tableBodyRows[rowIdx].getBoundingClientRect();
    const rowHeight = tableBodyRows[rowIdx].scrollHeight;
    if (rowBottom + 30 > boundary && spliceIdxs.length < 1) {
      currRowHeight = rowHeight
      spliceIdxs.push(rowIdx)
      continue;
    }
    if (spliceIdxs.length >= 1) {
      if (currRowHeight + rowHeight > max) {
        currRowHeight = rowHeight;
        spliceIdxs.push(rowIdx);
      } else {
        currRowHeight += rowHeight;
      }
    }

    rowIdx += 1;
  }
  const splicedRows: HTMLTableRowElement[][] = spliceIdxs.reverse().map((spliceIdx) => tableBodyRows.splice(spliceIdx)).reverse();
  return [tableBodyRows, ...splicedRows];
}

const generateSplitTableHtml = (tableClass: string, tableElements: Record<string, any>, splicedRows: HTMLTableRowElement[][]) => {
  const { tableContainerEl, tabTableHeader, tabTable, tableHead } = tableElements;
  const tableHeaderWithContinue = tabTableHeader.cloneNode(true);
  tableHeaderWithContinue.innerHTML = `<span>${tabTableHeader.textContent} (cont.)</span>`;
  return splicedRows.map((splicedRowGroup: HTMLTableRowElement[], tableIdx) => (`
    <div class="${tableClass}">
      <div class="${tableContainerEl.className}">
        ${tableIdx > 0 ? tableHeaderWithContinue.outerHTML : tabTableHeader.outerHTML}
        <table class="${tabTable.className}" role="table">
          ${tableHead.outerHTML}
          <tbody role="rowgroup">
          ${splicedRowGroup.map(row => row.outerHTML.trim()).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `))
}

const generateMultiPageTabHtml = (pageDetails: any, tabElements: Record<string, any>, tablesToAdd: HTMLDivElement[], currPageNum = 0) => {
  const { tabHeading, tabTablesContainer } = tabElements;
  const {
    right: tablesContainerRight,
  } = tabTablesContainer.getBoundingClientRect();
  const continuedHeading = `<div class='tab__title'>${tabHeading.innerText} (cont.)</div>`
  let currPageTables: HTMLDivElement[] = [];
  let tabTablesByPage = [];
  let tablesContainerCurrRight = tablesContainerRight * 2
  for (let tableIdx in tablesToAdd) {
    const currTable = tablesToAdd[tableIdx];
    const currTableBounds = currTable.getBoundingClientRect();
    const { right } = currTableBounds;
    if (right > tablesContainerCurrRight) {
      tabTablesByPage.push(currPageTables);
      currPageTables = [currTable];
      tablesContainerCurrRight += tablesContainerRight
    } else {
      currPageTables.push(currTable)
    }
  }
  if (currPageTables.length) {
    tabTablesByPage.push(currPageTables)
  }
  tablesToAdd.forEach(table => tabTablesContainer.removeChild(table));
  const initialTabPageTables = Array.from(tabTablesContainer.getElementsByClassName('tab__table'));
  tabTablesByPage = [initialTabPageTables, ...tabTablesByPage];
  return tabTablesByPage.map((pageTabTables, pageIdx) => {
    return (`
      <div class='${pageDetails.tabName} tab'>
        <div class='tab__header'>
          <div class='details'>
              <div class='details-left'>
                ${pageDetails.pageHeaderDetails}
              </div>
              <div class='details-right' >
                pg.${currPageNum + pageIdx}
              </div>
          </div>
          <div class='address'>
            ${pageDetails.address}
          </div>
        </div>
        ${pageIdx === 0 ? tabHeading.outerHTML : continuedHeading}
        <div class='tab__tables'>      
          ${pageTabTables.map((tabTable: any) => tabTable.outerHTML).join('')}
        </div>
      </div>
    `)
  })
}

async function generatePdf() {
  const pdf: any = new jsPDF('p', 'pt', 'letter');
  const maxRowHeight = 620;
  const pageWidth = pdf.getPageWidth();
  const address = "One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.)"   //TODO: Make these dynamic in real app
  const pageHeaderDetails = 'Details: One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.) New York-Newark-Jersey City, NY-NJ-PA Office'   //TODO: Make these dynamic in real app
  const pdfOutput: HTMLElement = document.querySelector('.pdf-output');
  const {
    right: pdfRight,
    bottom: pdfBottom,
  } = pdfOutput.getBoundingClientRect();
  const pagesHTML: string[] = [];
  const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll('.tab'));
  let currPageNum = pdf.getNumberOfPages();
  let totalNumPages = currPageNum;
  const pdfPagesDetails: any = {
    totalNumPages: totalNumPages,
    pages: [] as [],
  };
  tabs.forEach((tab: HTMLElement) => {

    const pageDetails: any = {
      tabName: tab.classList[0], // Loan
      pageNum: currPageNum,
      address: address,
      tables: [],
      html: '',
      pageTitle: '',
      pageHeaderDetails: pageHeaderDetails,
      coreElements: null,
    }
    const additionalTabPagesTables: any = [];
    const coreTabElements: Record<string, any> = {
      tab,
      tabHeading: tab.getElementsByClassName('tab__title')[0] as HTMLElement,
      tabTablesContainer: tab.getElementsByClassName('tab__tables')[0] as HTMLElement,
    }
    const { right: tablesContainerRight, bottom: tablesContainerBottom } = coreTabElements.tabTablesContainer.getBoundingClientRect();
    // 1st Validation: Check and Fix Vertical Overflow if it Exists by Splitting the HTML Tables 
    if (coreTabElements.tabTablesContainer.scrollHeight > pdfBottom) {
      const currTabTables = Array.from(coreTabElements.tabTablesContainer.getElementsByClassName('tab__table') as HTMLCollection) as HTMLElement[];
      for (let tableIdx in currTabTables) {
        const tabTableWrapperEl = currTabTables[tableIdx];
        const tabTableClassName = tabTableWrapperEl.className;
        const tableElements: any = {
          tableContainerEl: tabTableWrapperEl.getElementsByClassName('trepp__tableContainer')[0] as HTMLDivElement,
        }
        tableElements.tabTableHeader = tableElements.tableContainerEl.getElementsByClassName('trepp__tableHeader')[0] as HTMLDivElement;
        tableElements.tabTable = tableElements.tableContainerEl.getElementsByClassName('trepp__table')[0] as HTMLTableElement;
        tableElements.tableHead = tableElements.tabTable.tHead as HTMLTableSectionElement;
        tableElements.tableBody = tableElements.tabTable.tBodies[0] as HTMLTableSectionElement;
        const { top: tableContainerTop } = tableElements.tableContainerEl.getBoundingClientRect();
        const { height: tableHeight } = tableElements.tabTable.getBoundingClientRect();
        if (tableContainerTop + tableHeight > tablesContainerBottom) {
          const tableBodyRows: HTMLTableRowElement[] = Array.from(tableElements.tableBody.rows);
          const splicedTableRows = getSplicedRows(tableBodyRows, tablesContainerBottom, maxRowHeight);
          const splitTablesHtml: string[] = generateSplitTableHtml(tabTableClassName, tableElements, splicedTableRows)
          const rawTablesHtml = splitTablesHtml.reduce((htmlStr, splitTableHtml) => `${htmlStr}\n${splitTableHtml}`, '')
          tabTableWrapperEl.outerHTML = rawTablesHtml;
        }
      }
    }
    // 2nd Validation: Check and Fix Horizontal Overflowing Tables By Creating New Pages for the Overflowing tables
    if (coreTabElements.tabTablesContainer.scrollWidth > pdfRight) {
      const currTabTables = Array.from(coreTabElements.tabTablesContainer.getElementsByClassName('tab__table') as HTMLCollection) as HTMLElement[];
      for (let tableIdx in currTabTables) {
        const tabTableWrapperEl = currTabTables[tableIdx];
        const tabTableClassName = tabTableWrapperEl.className;
        const tableElements: any = {
          tableContainerEl: tabTableWrapperEl.getElementsByClassName('trepp__tableContainer')[0] as HTMLDivElement,
        }
        const { left: tableContainerLeft } = tableElements.tableContainerEl.getBoundingClientRect();
        tableElements.tabTable = tableElements.tableContainerEl.getElementsByClassName('trepp__table')[0] as HTMLTableElement;
        const { width: tableWidth } = tableElements.tabTable.getBoundingClientRect();

        if (tableContainerLeft + tableWidth > tablesContainerRight) {
          additionalTabPagesTables.push(tabTableWrapperEl)
        }
      }
    }

    if (additionalTabPagesTables.length) {
      const multipleTabPages = generateMultiPageTabHtml(pageDetails, coreTabElements, additionalTabPagesTables, currPageNum);
      currPageNum += multipleTabPages.length - 1;
      pagesHTML.push(...multipleTabPages);
      tab.outerHTML = multipleTabPages.reduce((htmlStr, pageTablesHtml) => `${htmlStr}\n${pageTablesHtml}`, currPageNum)
    } else {
      const pageHTML = `
        <div class='${pageDetails.tabName} tab'>
          <div class='tab__header'>
            <div class='details'>
                <div class='details-left'>
                  ${pageHeaderDetails}
                </div>
                <div class='details-right' >
                  pg.${currPageNum}
                </div>
            </div>
            <div class='address'>
              ${address}
            </div>
          </div>
        ${coreTabElements.tabHeading.outerHTML}
        ${coreTabElements.tabTablesContainer.outerHTML}
        </div>`;
      pagesHTML.push(pageHTML);
    }
    currPageNum += 1;
  });


  for (let pageIdx in pagesHTML) {
    await pdf.html(pagesHTML[pageIdx], {
      autoPaging: false,
      width: pageWidth - 10,
      windowWidth: pageWidth,
    });
    if (Number(pageIdx) < pagesHTML?.length - 1) {
      await pdf.addPage();
    }
  }
  // ((document as any).getElementById('output').data = pdf.output('datauristring'));
  pdf.save();
}
generatePdf();