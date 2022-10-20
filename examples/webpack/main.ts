import jsPDF from 'jspdf';
import 'jspdf-autotable';
import 'html2canvas';

const pdf = new jsPDF('p', 'pt', 'letter')




type TabMeta = {
    numTabPages?: number;
    pagesHTML?: string[]
}

type Boundaries = {
    tableBottom?: number;
    tableRight?: number;
    tableWidth?: number;
    tableHeight?: number;
    tabTablesMaxWidth?: number;
    tabTablesMaxHeight?: number;
    tabTablesBottom?: number;
    tabTablesRight?: number;
}

type SplitTableMeta = {
    tableWrapperClass: string;
    tableHeader: HTMLElement,
    tableHead: HTMLTableSectionElement,
    splitTableRows: HTMLTableRowElement[][]
}

const pdfOptions = {
    pageWidth: 611,
    pageHeight: 791,
    maxTabTablesHeight: 690,
}

const classSelectors = {
    pdfClass: 'pdf-output',
    tabClass: 'tab',
    tabTablesClass: 'tab__tables',
    tabHeaderClass: 'tab__header',
    detailsClass: 'details',
    detailsLeftClass: 'details-left',
    detailsRightClass: 'details-right',
    addressClass: 'address',
    tabTitleClass: 'tab__title',
    tableWrapperClass: 'tab__table',
    tableContainerClass: 'trepp__tableContainer',
    tableTitleClass: 'trepp__tableHeader',
    tableClass: 'trepp__table',
}

const buildSplitTablesHTML = (classSelectors: Record<string, string>, { tableWrapperClass, tableHeader, tableHead, splitTableRows }: SplitTableMeta): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    return splitTableRows.reduce((splitTablesHTML: string[], tableRows, tableIdx): string[] => {
        const tableHeaderText = tableHeader.textContent;
        const header = tableIdx > 0 && !tableHeaderText.includes('(cont.)') ? `${tableHeaderText} (cont.)` : tableHeaderText;
        const tableHTML = `
            <div class='${tableWrapperClass} ${tableIdx > 0 ? `continued-${tableIdx}` : ''}>
                <div class='${tableContainerClass}'>
                    <div class='${tableTitleClass}'>
                        ${header.trim()}
                    </div>
                    <table class='${tableClass}' role='table'>
                        ${tableHead.outerHTML}
                        <tbody>
                            ${tableRows.map(row => row.outerHTML).join('').trim()}
                        </tbody>
                    </table>
                </div>
            </div>
        `.trim();
        splitTablesHTML.push(tableHTML);
        return splitTablesHTML;
    }, []);
}

const splitLongTable = (classSelectors: Record<string, string>, tableWrapper: HTMLElement, { tabTablesMaxHeight, tabTablesBottom }: Boundaries): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableFullClass: string = tableWrapper.className;
    const tableContainer: HTMLElement = tableWrapper.querySelector(`.${tableContainerClass}`);
    const tableHeader: HTMLElement = tableContainer.querySelector(`.${tableTitleClass}`);
    const table: HTMLTableElement = tableContainer.querySelector(`.${tableClass}`);
    const tableHead: HTMLTableSectionElement = table.tHead;
    const maxRowHeight: number = tabTablesMaxHeight - tableHeader.clientHeight - tableHead.clientHeight;
    const tableBody: HTMLTableSectionElement = table.tBodies[0];
    const tableBodyRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
    // Find the first row whose bottom exceeds tabTablesBottom. This is the row that we need to start the split from
    const spliceIdx: number = tableBodyRows.findIndex((row: HTMLTableRowElement) => row.getBoundingClientRect().bottom > tabTablesBottom)
    const splicedRows: HTMLTableRowElement[] = tableBodyRows.splice(spliceIdx);
    const splitTableRows: HTMLTableRowElement[][] = [tableBodyRows];
    let currSplitTableRows: HTMLTableRowElement[] = [];
    let currRowHeight: number = 0;
    for (const rowIdx in splicedRows) {
        const row: HTMLTableRowElement = splicedRows[rowIdx];
        const rowHeight = row.getBoundingClientRect().height;
        if (rowHeight + currRowHeight < maxRowHeight) {
            currRowHeight += rowHeight;
            currSplitTableRows.push(row);
        } else {
            splitTableRows.push(currSplitTableRows);
            currRowHeight = rowHeight;
            currSplitTableRows = [row];
        }
    }
    if (currSplitTableRows.length) {
        splitTableRows.push(currSplitTableRows);
    }
    return buildSplitTablesHTML(classSelectors, { tableWrapperClass: tableFullClass, tableHeader, tableHead, splitTableRows });
}

const splitLongTables = ({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement }) => {
    const { tableWrapperClass } = classSelectors;
    const { bottom: tabTablesBottom } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    for (const tableWrapper of tableWrappers) {
        const tableName = tableWrapper.className;
        const { bottom, height } = tableWrapper.getBoundingClientRect();
        if (bottom > tabTablesBottom) {
            console.log(`${tableName} has Y Overflow! Has height of ${height}, bottom of ${bottom} and exceeds tabTablesBottom of ${tabTablesBottom} by ${bottom - tabTablesBottom}`)
            const splitTableHTML: string[] = splitLongTable(classSelectors, tableWrapper, { tableBottom: bottom, tableHeight: height, tabTablesMaxHeight: tabTables.clientHeight, tabTablesBottom });
            tableWrapper.outerHTML = splitTableHTML.map(splitTableHTML => splitTableHTML).join('\n');
            handleOverflow({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }, { wideTablesHandled: true, longTablesHandled: true });
        }

    }
}






const buildSplitTabTablesHTML = (classSelectors: Record<string, string>, pageNum: number, tab: HTMLElement, tabTablesPerPage: HTMLElement[][]): string[] => {
    const { tabHeaderClass, detailsClass, detailsLeftClass, detailsRightClass, addressClass, tabTablesClass, tabTitleClass } = classSelectors;
    const msaText = tab.querySelector(`.${detailsLeftClass}`).textContent.replace('\n', '').replace(/\s+/g, " ").trim();
    const addressText = tab.querySelector(`.${addressClass}`).textContent.replace('\n', '').replace(/\s+/g, " ").trim();
    const titleText = tab.querySelector(`.${tabTitleClass}`).textContent.trim();
    let currPageNum = pageNum;
    //We need to break down the original x overflowing tab into one or more additional tabPages
    return tabTablesPerPage.map((pageTables, pageIdx) => {
        return `
            <div class='${tab.className} ${pageIdx > 0 ? `continued-${pageIdx}` : ''}'>
                <div class='${tabHeaderClass}'>
                    <div class='${detailsClass}'>
                        <div class='${detailsLeftClass}'>
                            ${msaText}
                        </div>
                        <div class='${detailsRightClass}'>
                            pg. ${currPageNum + pageIdx}
                        </div>
                    </div>
                    <div class='${addressClass}'>
                        ${addressText}
                    </div>
                </div>
                <div class='${tabTitleClass}'>
                    ${titleText} ${pageIdx > 0 ? `(cont.)` : ''}
                </div>
                <div class='${tabTablesClass}'>
                    ${pageTables.map(table => table.outerHTML).join('')}
                </div>
            </div>
        `
    });
}

const getTabTablesPerPage = (tableWrappers: HTMLElement[], splitTableWrappers: HTMLElement[], { tabTablesMaxWidth }: Boundaries): HTMLElement[][] => {
    //We need to iterate through all the splitTableWrappers and add them to currPageTables until width is exceeded.
    const tabTablesPerPage: HTMLElement[][] = [tableWrappers];
    let currPageTables: HTMLElement[] = []
    let maxRight = splitTableWrappers[0].getBoundingClientRect().left + tabTablesMaxWidth;
    splitTableWrappers.forEach(tableWrapper => {
        if (tableWrapper.getBoundingClientRect().right <= maxRight) {
            currPageTables.push(tableWrapper);
        } else {
            tabTablesPerPage.push(currPageTables);
            maxRight = tableWrapper.getBoundingClientRect().left + tabTablesMaxWidth;
            currPageTables = [tableWrapper];
        }
    })
    if (currPageTables.length) {
        tabTablesPerPage.push(currPageTables);
    }
    return tabTablesPerPage;
}

const createAdditionalTabPages = ({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement }) => {
    console.info(`X Overflow exists in TabTables Container. Need to find and restructure all X overflowing tables`)
    const { tableWrapperClass } = classSelectors
    const { right: tabTablesRight } = tabTables.getBoundingClientRect();
    let currPageNum = pageNum;
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    //Find the index of the first horizontal overflowing table;
    let spliceIdx = -1;
    for (const tableWrapperIdx in tableWrappers) {
        const tableWrapper = tableWrappers[tableWrapperIdx];
        const { right, width } = tableWrapper.getBoundingClientRect();
        if (right > tabTablesRight) {
            spliceIdx = Number(tableWrapperIdx);
            break;
        }
    }
    if (spliceIdx === -1) return {
        numTabPages: 1,
        pagesHTML: [tab.outerHTML],
    };
    const splitTableWrappers = tableWrappers.splice(spliceIdx);
    const tabTablesPerPage: HTMLElement[][] = getTabTablesPerPage(tableWrappers, splitTableWrappers, { tabTablesMaxWidth: tabTables.clientWidth });
    const tabTablesHTML: string[] = buildSplitTabTablesHTML(classSelectors, currPageNum, tab, tabTablesPerPage);
    tab.outerHTML = Array.from(tabTablesHTML).map(pageHTML => pageHTML).join('\n');
}

const handleOverflow = (
    { classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement },
    overflowValidations = { wideTablesHandled: false, longTablesHandled: false }) => {
    const { wideTablesHandled, longTablesHandled } = overflowValidations;
    const { clientWidth: tabTablesClientWidth, clientHeight: tabTablesClientHeight, scrollWidth: tabTablesScrollWidth, scrollHeight: tabTablesScrollHeight } = tabTables;
    // No overflow exists, skip!
    if (tabTablesClientWidth === tabTablesScrollWidth && tabTablesClientHeight === tabTablesScrollHeight) {
        return;
    }

    //Handle Tables that are too wide
    if (!wideTablesHandled) {
        splitWideTables({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }, { tabTablesMaxWidth: tabTablesClientWidth });
    }

    if (tabTablesClientHeight < tabTablesScrollHeight && !longTablesHandled) {
        splitLongTables({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum })
    }

    if (tabTablesClientWidth < tabTablesScrollWidth && longTablesHandled && wideTablesHandled) {
        createAdditionalTabPages({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum })
    }
}

const splitWideTables = ({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement }, { tabTablesMaxWidth }: Boundaries) => {
    const { tableWrapperClass } = classSelectors
    const { right: tabTablesRight } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    for (const tableWrapper of tableWrappers) {
        const tableName = tableWrapper.className;
        const { right, width } = tableWrapper.getBoundingClientRect();
        if (right > tabTablesRight) {
            console.log(`${tableName} has X Overflow! Has width of ${width}, right of ${right} and exceeds tabTablesRight of ${tabTablesRight} by ${right - tabTablesRight}`);
            const splitTableHTML = splitWideTable(classSelectors, tableWrapper, { tabTablesMaxWidth: tabTables.clientWidth, tabTablesRight })
            handleOverflow({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }, { wideTablesHandled: true, longTablesHandled: false });
        }

    }

}

const splitWideTable = (classSelectors: Record<string, string>, tableWrapper: HTMLElement, { tabTablesMaxWidth, tabTablesRight }: Boundaries): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableFullClass: string = tableWrapper.className;
    const tableContainer: HTMLElement = tableWrapper.querySelector(`.${tableContainerClass}`);
    const tableHeader: HTMLElement = tableContainer.querySelector(`.${tableTitleClass}`);
    const table: HTMLTableElement = tableContainer.querySelector(`.${tableClass}`);
    const tableHead: HTMLTableSectionElement = table.tHead;
    //If no tHead, we look at tBody to find the colIdx to splice from the table. You have to go through each tr in thead and tbody and remove the overflowing columns using the splice idx
    const tableBody: HTMLTableSectionElement = table.tBodies[0];
    const tableBodyRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
    const splicedTableCols: { splicedHeadCols: HTMLTableCellElement[], splicedBodyCols: HTMLTableCellElement[] } = {
        splicedHeadCols: [],
        splicedBodyCols: []
    };
    debugger;
    //We need to find the first column that overflows, then create a new table with the first column repeated and overflowing columns. If there's
    //subheaders you need to cut those off properly as well.

    return []
}


const generatePDF = async ({ pdfOptions, classSelectors }: any) => {
    const { pageWidth, pageHeight } = pdfOptions;
    const { pdfClass, tabClass, tabHeaderClass, tabTitleClass, tabTablesClass } = classSelectors;
    const pdfOutput: HTMLElement = document.querySelector(`.${pdfClass}`);
    const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    let currPageNum = 1;
    for (const tab of tabs) {
        // After grabbing PDF Output, the main thing to do for each tab is to detect and handle horizontal & vertical overflow in the .tab__tables container of each tab.
        const tabHeader: HTMLElement = tab.querySelector(`.${tabHeaderClass}`);
        const tabTitle: HTMLElement = tab.querySelector(`.${tabTitleClass}`);
        const tabTables: HTMLDivElement = tab.querySelector(`.${tabTablesClass}`);
        handleOverflow({ classSelectors, tab, pageHeader: tabHeader, pageName: tabTitle.textContent, tabTables, pageNum: currPageNum });
        currPageNum++;
    }


    const formattedTabsHTML: string[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`)).map(tab => tab.outerHTML.trim());


    console.log('formattedTabs', formattedTabsHTML)

    for (let tabIdx in formattedTabsHTML) {
        await pdf.html(formattedTabsHTML[tabIdx], {
            autoPaging: false,
            width: pageWidth - 1,
            windowWidth: pageWidth,
            html2canvas: {
                async: true,
                height: pageHeight - 1,
                windowHeight: pageHeight
            }
        });
        if (Number(tabIdx) < formattedTabsHTML?.length - 1) {
            pdf.addPage();
        }
    }
    pdf.save();
}

generatePDF({ pdfOptions, classSelectors });