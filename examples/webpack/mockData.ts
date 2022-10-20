export const datasourceHTML = {

}

//   tables.forEach((tableWrapper: any) => {



// const pageWidth = pdf.getPageWidth();
// const address = "One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.)"   //TODO: Make these dynamic in real app
// const pageHeaderDetails = 'Details: One Vanderbilt: One Vanderbilt Ave. (51 E 42nd St.) New York-Newark-Jersey City, NY-NJ-PA Office'   //TODO: Make these dynamic in real app
// const pdfOutput: HTMLElement = document.querySelector('.pdf-output');
// const {
//   right: pdfRight,
//   bottom: pdfBottom,
// } = pdfOutput.getBoundingClientRect();
// const pagesHTML: string[] = [];
// const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll('.tab'));
// let currPageNum = pdf.getNumberOfPages();
// let totalNumPages = currPageNum;
// const pdfPagesDetails: any = {
//   totalNumPages: totalNumPages,
//   pages: [] as [],
// };
// tabs.forEach((tab: HTMLElement) => {

//   const pageDetails: any = {
//     tabName: tab.classList[0],
//     pageNum: currPageNum,
//     address: address,
//     tables: [],
//     html: '',
//     pageTitle: '',
//     pageHeaderDetails: pageHeaderDetails,
//     coreElements: null,
//   }
//   const additionalTabPagesTables: any = [];
//   const coreTabElements: Record<string, any> = {
//     tab,
//     tabHeading: tab.getElementsByClassName('tab__title')[0] as HTMLElement,
//     tabTablesContainer: tab.getElementsByClassName('tab__tables')[0] as HTMLElement,
//   }
//   const { right: tablesContainerRight, bottom: tablesContainerBottom } = coreTabElements.tabTablesContainer.getBoundingClientRect();
//   // 1st Validation: Check and Fix Vertical Overflow if it Exists by Splitting the HTML Tables
//   if (coreTabElements.tabTablesContainer.scrollHeight > pdfBottom) {
//     const currTabTables = Array.from(coreTabElements.tabTablesContainer.getElementsByClassName('tab__table') as HTMLCollection) as HTMLElement[];
//     for (let tableIdx in currTabTables) {
//       const tabTableWrapperEl = currTabTables[tableIdx];
//       const tabTableClassName = tabTableWrapperEl.className;
//       const tableElements: any = {
//         tableContainerEl: tabTableWrapperEl.getElementsByClassName('trepp__tableContainer')[0] as HTMLDivElement,
//       }
//       tableElements.tabTableHeader = tableElements.tableContainerEl.getElementsByClassName('trepp__tableHeader')[0] as HTMLDivElement;
//       tableElements.tabTable = tableElements.tableContainerEl.getElementsByClassName('trepp__table')[0] as HTMLTableElement;
//       tableElements.tableHead = tableElements.tabTable.tHead as HTMLTableSectionElement;
//       tableElements.tableBody = tableElements.tabTable.tBodies[0] as HTMLTableSectionElement;
//       const { top: tableContainerTop } = tableElements.tableContainerEl.getBoundingClientRect();
//       const { height: tableHeight } = tableElements.tabTable.getBoundingClientRect();
//       if (tableContainerTop + tableHeight > tablesContainerBottom) {
//         const tableBodyRows: HTMLTableRowElement[] = Array.from(tableElements.tableBody.rows);
//         const splicedTableRows = getSplicedRows(tableBodyRows, tablesContainerBottom, maxRowHeight);
//         const splitTablesHtml: string[] = generateSplitTableHtml(tabTableClassName, tableElements, splicedTableRows)
//         const rawTablesHtml = splitTablesHtml.reduce((htmlStr, splitTableHtml) => `${htmlStr}\n${splitTableHtml}`, '')
//         tabTableWrapperEl.outerHTML = rawTablesHtml;
//       }
//     }
//   }
//   // 2nd Validation: Check and Fix Horizontal Overflowing Tables By Creating New Pages for the Overflowing tables
//   if (coreTabElements.tabTablesContainer.scrollWidth > pdfRight) {
//     const currTabTables = Array.from(coreTabElements.tabTablesContainer.getElementsByClassName('tab__table') as HTMLCollection) as HTMLElement[];
//     for (let tableIdx in currTabTables) {
//       const tabTableWrapperEl = currTabTables[tableIdx];
//       const tabTableClassName = tabTableWrapperEl.className;
//       const tableElements: any = {
//         tableContainerEl: tabTableWrapperEl.getElementsByClassName('trepp__tableContainer')[0] as HTMLDivElement,
//       }
//       const { left: tableContainerLeft } = tableElements.tableContainerEl.getBoundingClientRect();
//       tableElements.tabTable = tableElements.tableContainerEl.getElementsByClassName('trepp__table')[0] as HTMLTableElement;
//       const { width: tableWidth } = tableElements.tabTable.getBoundingClientRect();

//       if (tableContainerLeft + tableWidth > tablesContainerRight) {
//         additionalTabPagesTables.push(tabTableWrapperEl)
//       }
//     }
//   }

//   if (additionalTabPagesTables.length) {
//     const multipleTabPages = generateMultiPageTabHtml(pageDetails, coreTabElements, additionalTabPagesTables, currPageNum);
//     currPageNum += multipleTabPages.length - 1;
//     pagesHTML.push(...multipleTabPages);
//     tab.outerHTML = multipleTabPages.reduce((htmlStr, pageTablesHtml) => `${htmlStr}\n${pageTablesHtml}`, currPageNum)
//   } else {
//     const pageHTML = `
//       <div class='${pageDetails.tabName} tab'>
//         <div class='tab__header'>
//           <div class='details'>
//               <div class='details-left'>
//                 ${pageHeaderDetails}
//               </div>
//               <div class='details-right' >
//                 pg.${currPageNum}
//               </div>
//           </div>
//           <div class='address'>
//             ${address}
//           </div>
//         </div>
//       ${coreTabElements.tabHeading.outerHTML}
//       ${coreTabElements.tabTablesContainer.outerHTML}
//       </div>`;
//     pagesHTML.push(pageHTML);
//   }
//   currPageNum += 1;
// });


// for (let pageIdx in pagesHTML) {
//   await pdf.html(pagesHTML[pageIdx], {
//     autoPaging: false,
//     width: pageWidth - 10,
//     windowWidth: pageWidth,
//   });
//   if (Number(pageIdx) < pagesHTML?.length - 1) {
//     await pdf.addPage();
//   }
// }

// const colorPalette = {
//   treppWhite: '#FFFFFF', // Used for row bg 1
//   treppLightGrey: '#EEEEEE', // Used for row bg 2
//   treppGrey: '#C5C5C5', // used for subheaders
//   treppBlack: '#333333', // use for text
//   //Updated
//   treppBlue: '#2C5CAA', // Used for Table Title Text
//   treppLightBlue: '#F2F8FD'


// };


// const getSplicedRows = (tableBodyRows: HTMLTableRowElement[], boundary: number, max: number = 650) => {
//   const spliceIdxs = [];
//   let rowIdx = 0;
//   let currRowHeight = 0;
//   while (rowIdx < tableBodyRows.length) {
//     const { bottom: rowBottom } = tableBodyRows[rowIdx].getBoundingClientRect();
//     const rowHeight = tableBodyRows[rowIdx].scrollHeight;
//     if (rowBottom + 30 > boundary && spliceIdxs.length < 1) {
//       currRowHeight = rowHeight
//       spliceIdxs.push(rowIdx)
//       continue;
//     }
//     if (spliceIdxs.length >= 1) {
//       if (currRowHeight + rowHeight > max) {
//         currRowHeight = rowHeight;
//         spliceIdxs.push(rowIdx);
//       } else {
//         currRowHeight += rowHeight;
//       }
//     }

//     rowIdx += 1;
//   }
//   const splicedRows: HTMLTableRowElement[][] = spliceIdxs.reverse().map((spliceIdx) => tableBodyRows.splice(spliceIdx)).reverse();
//   return [tableBodyRows, ...splicedRows];
// }

// const generateSplitTableHtml = (tableClass: string, tableElements: Record<string, any>, splicedRows: HTMLTableRowElement[][]) => {
//   const { tableContainerEl, tabTableHeader, tabTable, tableHead } = tableElements;
//   const tableHeaderWithContinue = tabTableHeader.cloneNode(true);
//   tableHeaderWithContinue.innerHTML = `<span>${tabTableHeader.textContent} (cont.)</span>`;
//   return splicedRows.map((splicedRowGroup: HTMLTableRowElement[], tableIdx) => (`
//     <div class="${tableClass}">
//       <div class="${tableContainerEl.className}">
//         ${tableIdx > 0 ? tableHeaderWithContinue.outerHTML : tabTableHeader.outerHTML}
//         <table class="${tabTable.className}" role="table">
//           ${tableHead.outerHTML}
//           <tbody role="rowgroup">
//           ${splicedRowGroup.map(row => row.outerHTML.trim()).join('')}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   `))
// }

// const generateMultiPageTabHtml = (pageDetails: any, tabElements: Record<string, any>, tablesToAdd: HTMLDivElement[], currPageNum = 0) => {
//   const { tabHeading, tabTablesContainer } = tabElements;
//   const {
//     right: tablesContainerRight,
//   } = tabTablesContainer.getBoundingClientRect();
//   const continuedHeading = `<div class='tab__title'>${tabHeading.innerText} (cont.)</div>`
//   let currPageTables: HTMLDivElement[] = [];
//   let tabTablesByPage = [];
//   let tablesContainerCurrRight = tablesContainerRight * 2
//   for (let tableIdx in tablesToAdd) {
//     const currTable = tablesToAdd[tableIdx];
//     const currTableBounds = currTable.getBoundingClientRect();
//     const { right } = currTableBounds;
//     if (right > tablesContainerCurrRight) {
//       tabTablesByPage.push(currPageTables);
//       currPageTables = [currTable];
//       tablesContainerCurrRight += tablesContainerRight
//     } else {
//       currPageTables.push(currTable)
//     }
//   }
//   if (currPageTables.length) {
//     tabTablesByPage.push(currPageTables)
//   }
//   tablesToAdd.forEach(table => tabTablesContainer.removeChild(table));
//   const initialTabPageTables = Array.from(tabTablesContainer.getElementsByClassName('tab__table'));
//   tabTablesByPage = [initialTabPageTables, ...tabTablesByPage];
//   return tabTablesByPage.map((pageTabTables, pageIdx) => {
//     return (`
//       <div class='${pageDetails.tabName} tab'>
//         <div class='tab__header'>
//           <div class='details'>
//               <div class='details-left'>
//                 ${pageDetails.pageHeaderDetails}
//               </div>
//               <div class='details-right' >
//                 pg.${currPageNum + pageIdx}
//               </div>
//           </div>
//           <div class='address'>
//             ${pageDetails.address}
//           </div>
//         </div>
//         ${pageIdx === 0 ? tabHeading.outerHTML : continuedHeading}
//         <div class='tab__tables'>      
//           ${pageTabTables.map((tabTable: any) => tabTable.outerHTML).join('')}
//         </div>
//       </div>
//     `)
//   })
// }



// const restructureOverflowingTables = (tabTables: HTMLElement) => {
//   const { top: tablesTop, left: tablesLeft, bottom: tablesBottom, right: tablesRight, width: tablesWidth, height: tablesHeight } = tabTables.getBoundingClientRect();
//   console.log(`tablesTop: ${tablesTop}, tablesBottom: ${tablesBottom}, tablesLeft: ${tablesLeft}, tablesRight ${tablesRight}, tablesWidth: ${tablesWidth}, tablesHeight: ${tablesHeight}`);
//   const tablesMeta: any = []
//   let currPageNum: number = 1;
//   let widthRemaining = tablesWidth;
//   let heightRemaining = tablesHeight;
//   const tables = Array.from(tabTables.getElementsByClassName('tab__table'));

//   for (let tableIdx = 0; tableIdx < tables.length - 1; tableIdx++) {
//     const tabTable = tables[tableIdx]
//     const prevTableMeta = tablesMeta[tableIdx - 1] || null;
//     const tableClass = tabTable.className;
//     const tableName = tabTable.classList[0];
//     const tableHeader = tabTable.querySelector('.trepp__tableHeader');
//     const { top: tableTop, left: tableLeft, bottom: tableBottom, right: tableRight, width: tableWidth, height: tableHeight } = tabTable.getBoundingClientRect();
//     console.log(`tableTop: ${tableTop}, tableBottom: ${tableBottom}, tableLeft: ${tableLeft}, tableRight ${tableRight}, tableWidth: ${tableWidth}, tableHeight: ${tableHeight}`)


//     if (heightRemaining - tableHeight >= 0) { // No Y Overflow
//       heightRemaining -= tablesHeight;
//     } else { // Y Overflow, we need to split the table so that it fills Y space
//       const tableBody: HTMLTableSectionElement = (tabTable.querySelector('.trepp__table') as HTMLTableElement).tBodies[0];
//       const tableHead: HTMLTableSectionElement = (tabTable.querySelector('.trepp__table') as HTMLTableElement).tHead;
//       // Find the rows to splice
//       const tableRows = Array.from(tableBody.rows);
//       const removedRows = []
//       let rowOverflowRemaining = tableBottom;
//       let currTop = prevTableMeta?.bottom || tablesTop;
//       console.log('currTop', currTop)

//       while (rowOverflowRemaining > tablesHeight - currTop) {
//         const currRow = tableRows[tableRows.length - 1];
//         rowOverflowRemaining -= currRow.clientHeight;
//         removedRows.push(tableRows.pop());
//       }
//       tableBody.innerHTML = tableRows.map(row => row.outerHTML).join('')



//       tabTable.outerHTML = `
//         <div class='${tableClass}'>
//           <div class='trepp__tableHeader'>
//             ${tableHeader.innerHTML}
//           </div>
//           <table class='trepp__table' role='table'>
//             ${tableHead.outerHTML}
//             ${tableBody.outerHTML}
//           </table>
//         </div>
//         <div class='${tableClass} continued'>
//         <div class='trepp__tableHeader'>
//           ${tableHeader.innerHTML}
//         </div>
//         <table class='trepp__table' role='table'>
//           ${tableHead.outerHTML}
//           <tbody>
//             ${removedRows.map(row => row.outerHTML).join('')}
//           </tbody>
//         </table>
//       </div>
//       `
//     }

//     if (widthRemaining - tableWidth >= 0) {
//       widthRemaining -= tableWidth;
//     } // No X overflow







//     const tableMeta = {
//       name: tableName,
//       pageNum: currPageNum,
//       element: tabTable,
//       left: tableLeft,
//       top: tableTop,
//       right: tableRight,
//       bottom: tableBottom,
//       width: tableWidth,
//       height: tableHeight,
//     }



//     if (tableBottom > tablesBottom) {
//       console.log(`Table ${tableClass} has Y OVERFLOW!`);

//     }
//     if (tableRight > tablesRight) {
//       console.log(`Table ${tableClass} has X OVERFLOW!`);
//     }


//     tablesMeta.push(tableMeta);
//   };

//   debugger;
// }

// const handleOverflowingTables = (tabTables: HTMLElement) => {


// }

// async function generatePdf() {


// const pdfOutput = document.querySelector('#pdf');
// const pdfBounds = pdfOutput.getBoundingClientRect();
// console.log('pdfBounds', pdfBounds);
// const tabs = Array.from(pdfOutput.querySelectorAll('.tab'));
// console.log('tabs', tabs)
// for (const tabIdx in tabs) {
//   const currTab = tabs[tabIdx];
//   const currTabBounds = currTab.getBoundingClientRect();
//   const currTabHeader = currTab.querySelector('.tab__header');
//   const currTabTitle = currTab.querySelector('.tab__title');
//   const currTabTables: HTMLElement = currTab.querySelector('.tab__tables');
//   const overflowingTables = restructureOverflowingTables(currTabTables);
// }

// await pdf.html(pdfOutput.outerHTML, {
//   width: pageWidth,
//   margin: pageMargin,
//   windowWidth: pageWindowWidth,
//   html2page: {
//     height: pageHeight,
//     windowHeight: pageWindowHeight,
//     async: true,
//   }
// });

// pdf.save();


// }
// generatePdf();

// const userDefaultReport = userData?.defaultSettings?.fin_ReportFmt.toUpperCase() || 'SUMMARY';
// Research: <ResearchTab loanuniversepropid={loanUniversePropID} isPDF={true} />,
// Title: <TitleDataTab pinid={loanUniverseLoan?.pinid} isPDF={true} />,
// Additional_Debt: <AdditionalDebtTab loanuniverseloanid={loanUniverseLoan?.loanuniverseloanid} />,
// My_Comments: <MyCommentsTab loanuniverseloanid={loanUniverseLoan?.loanuniverseloanid as string} />,
// Commentary: <CommentaryTab loanuniversepropid={loanUniversePropID} isPDF={true} />,
// Property_Financials: (
//     <PropertyFinancialsTab
//         loanuniversepropid={loanUniversePropID}
//         defaultReport={userDefaultReport}
//     />
// )



// const options: any = {
//   canvasWidth: 572,
//   canvasWindowWidth: 612,
//   canvasHeight: 752,
//   canvasWindowHeight: 792,
//   canvasMargin: 20,
//   maxTablesContainerHeight: 727,
// };


// const generatePdf = async () => {
//   const { pageWidth, pageWindowWidth, pageHeight, pageWindowHeight, pageMargin } = options;
//   const pdf: any = new jsPDF('p', 'pt', 'letter');
//   const pagesMeta: any = []
//   let currPageNum = 1;
//   const pdfOutput = document.querySelector('#pdf');
//   const tabs = pdfOutput.querySelectorAll('.tab');
//   for (let tabIdx = 0; tabIdx < tabs.length; tabIdx++) {
//     const tab: Element = tabs[tabIdx];
//     const tabTables: HTMLElement = tab.querySelector('.tab__tables');
//     console.log('tabTables', tabTables)
//     const formattedTabHtml = generatePDFTabTables(tabTables);

//   }
// }

// const generatePDFTabTables = (tabTables: HTMLElement) => {
//   const { top: tablesTop, left: tablesLeft, bottom: tablesBottom, right: tablesRight, width: tablesWidth, height: tablesHeight } = tabTables.getBoundingClientRect();
//   console.log(`tablesTop: ${tablesTop}, tablesBottom: ${tablesBottom}, tablesLeft: ${tablesLeft}, tablesRight ${tablesRight}, tablesWidth: ${tablesWidth}, tablesHeight: ${tablesHeight}`);
//   const tablesMeta: any = []
//   let currPageNum: number = 1;
//   let widthRemaining = tablesWidth;
//   let heightRemaining = tablesHeight;
//   const tables = tabTables.getElementsByClassName('tab__table');
//   // console.log('tables', tables)
//   const tabTablesByPage: HTMLElement[][] = [];
//   const currPageTabTables: HTMLElement[] = [];
//   let prevLeft = null;
//   let prevBottom = null;
//   let prevWidth = null;
//   let prevHeight = null;
//   for (let tableIdx = 0; tableIdx < tables.length; tableIdx++) {
//     const currTable: HTMLElement = tables[tableIdx] as HTMLElement;
//     const { top: tableTop, left: tableLeft, bottom: tableBottom, right: tableRight, width: tableWidth, height: tableHeight } = currTable.getBoundingClientRect();

//     if (tableBottom < tablesBottom && tableRight < tablesRight) {
//       console.log(`Table ${currTable.className} has NO overflow`)
//       //If table has no overflow, just add it to currPageTabTables
//       currPageTabTables.push(currTable);
//     }
//     if (tableBottom > tablesBottom && tableRight > tablesRight) {
//       console.log(`Table ${currTable.className}  has Y Overflow and X Overflow`)
//       // If table overflows on both the X and Y Axis. A new page(s) with the split table portions should be added. Horizonatl split table should come first then
//       // vertical split table
//     }
//     if (tableBottom > tablesBottom && tableRight < tablesRight) {
//       console.log(`Table ${currTable.className}  has only Y Overflow`)
//       // Table is too long need to split
//       const splitLongTableHtml = getHtmlForSplitLongTable(currTable, tablesBottom);

//     }
//     if (tableBottom < tablesBottom && tableRight > tablesRight) {
//       console.log(`Table ${currTable.className} has only X Overflow`)
//     }

//     prevLeft = tableLeft;
//     prevBottom = tableBottom;
//     prevWidth = tableWidth;
//     prevHeight = tableHeight;
//   }
// }

// const getHtmlForSplitLongTable = (currTable: HTMLElement, maxBottom: number, maxRowHeight = 600) => {
//   const tableBodyRows = Array.from(currTable.querySelector('tbody').rows);
//   debugger;
//   const splicedRowsPerTable: HTMLTableRowElement[][] = []
//   let idxForEachSplit: number[] = []
//   let currSplitRowHeight = 0;
//   for (let rowIdx = tableBodyRows.length - 1; rowIdx >= 1; rowIdx--) {
//     const currRowBounds = tableBodyRows[rowIdx].getBoundingClientRect();
//     currSplitRowHeight += currRowBounds.height;
//     if (currRowBounds.bottom < maxBottom) {
//       idxForEachSplit = [rowIdx + 1, ...idxForEachSplit]
//       break;
//     } else if (currSplitRowHeight > maxRowHeight) {
//       currSplitRowHeight = 0;
//       idxForEachSplit = [rowIdx - 1, ...idxForEachSplit]
//     }
//   }
//   console.log('idxForEachSplice', idxForEachSplit)
// }

// generatePdf();