import jsPDF from 'jspdf';
import 'jspdf-autotable';
import 'html2canvas';

const pdf = new jsPDF('p', 'pt', 'letter')

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

type SplitTableCell = {
    colSpan?: number;
    cellText: string;
}

type SplitLongTableMeta = {
    tableWrapperClass: string;
    tableHeader: HTMLElement,
    tableHead: HTMLTableSectionElement,
    splitTableRows: HTMLTableRowElement[][]
}

type splitWideTableMeta = {
    tableWrapperClass: string;
    tableHeader: HTMLElement;
    splitTableHeadCells: SplitTableCell[][][],
    splitTableBodyCells: SplitTableCell[][][]
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
const formatText = (text: string): string => {
    return text.replace('\n', '').replace(/\s+/g, " ").trim();
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

const handleOverflow = (
    { classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement },
    overflowValidations = { wideTablesHandled: false, longTablesHandled: false }) => {
    let { wideTablesHandled, longTablesHandled } = overflowValidations;
    let { clientWidth: tabTablesClientWidth, clientHeight: tabTablesClientHeight, scrollWidth: tabTablesScrollWidth, scrollHeight: tabTablesScrollHeight } = getLatestTabTables(classSelectors, tab);
    // No overflow exists and no DOM Manipulation needed, skip!
    if (tabTablesClientWidth === tabTablesScrollWidth && tabTablesClientHeight === tabTablesScrollHeight) {
        return;
    }
    //Handle Tables that are too wide
    if (tabTablesClientWidth < tabTablesScrollWidth && !wideTablesHandled) {
        tabTables = getLatestTabTables(classSelectors, tab);
        splitWideTables({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }, { tabTablesMaxWidth: tabTablesClientWidth });
        console.log(`Wide Tables Handled`)
    } else {
        wideTablesHandled = true;
    }


    //Handle Tables that are too long
    if (tabTablesClientHeight < tabTablesScrollHeight && wideTablesHandled && !longTablesHandled) {
        tabTables = getLatestTabTables(classSelectors, tab);
        splitLongTables({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum })
    } else {
        longTablesHandled = true;
    }

    //Handle Tabs with too many tables causing X overflow
    if (tabTablesClientWidth < tabTablesScrollWidth && wideTablesHandled && longTablesHandled) {
        tabTables = getLatestTabTables(classSelectors, tab);
        buildAdditionalTabPages({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum })
    }
}

const getLatestTabTables = (classSelectors: Record<string, string>, tab: HTMLElement): HTMLElement => tab.querySelector(`.${classSelectors.tabTablesClass}`)

const splitWideTables = ({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement }, { tabTablesMaxWidth }: Boundaries) => {
    const { tableWrapperClass, tabTablesClass } = classSelectors
    const { right: tabTablesRight } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    const updatedHTMLByTable: string[] = []
    for (const tableWrapper of tableWrappers) {
        const { left: wrapperLeft } = tableWrapper.getBoundingClientRect();
        const maxRight = wrapperLeft < tabTablesRight ? tabTablesRight : wrapperLeft + tabTablesMaxWidth;
        const tableName = tableWrapper.className;
        const { right, width } = tableWrapper.getBoundingClientRect();
        if (right > maxRight) {
            console.log(`${tableName} has X Overflow! Has width of ${width}, right of ${right} and exceeds tabTablesRight of ${tabTablesRight} by ${right - tabTablesRight}`);
            const splitTableHTML = splitWideTable(classSelectors, tableWrapper, { tabTablesMaxWidth: tabTables.clientWidth, tabTablesRight: maxRight });
            updatedHTMLByTable.push(...splitTableHTML);
        } else {
            updatedHTMLByTable.push(tableWrapper.outerHTML);
        }
    }
    tabTables.innerHTML = updatedHTMLByTable.join('')
    handleOverflow({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }, { wideTablesHandled: true, longTablesHandled: false });
}

const splitWideTable = (classSelectors: Record<string, string>, tableWrapper: HTMLElement, { tabTablesMaxWidth, tabTablesRight }: Boundaries): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableFullClass: string = tableWrapper.className;
    const tableContainer: HTMLElement = tableWrapper.querySelector(`.${tableContainerClass}`);
    const tableHeader: HTMLElement = tableContainer.querySelector(`.${tableTitleClass}`);
    const table: HTMLTableElement = tableContainer.querySelector(`.${tableClass}`);
    const tableHead: HTMLTableSectionElement = table.tHead;
    const tableHeadRows: HTMLTableRowElement[] = Array.from(tableHead.rows);
    const tableBody: HTMLTableSectionElement = table.tBodies[0];
    const tableBodyRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
    const spliceIdx = Array.from(tableBodyRows[0].cells).findIndex(((cell) => cell.getBoundingClientRect().right > tabTablesRight));
    const splitTableHeadCells: SplitTableCell[][][] = getSplitTableHeadCells(tableHeadRows, spliceIdx, tabTablesRight);
    const splitTableBodyCells: SplitTableCell[][][] = getSplitTableBodyCells(tableBodyRows, spliceIdx, splitTableHeadCells, tabTablesRight);
    return buildSplitWideTablesHTML(classSelectors, { tableWrapperClass: tableFullClass, tableHeader, splitTableHeadCells, splitTableBodyCells })

}

const getSplitTableHeadCells = (tableHeadRows: HTMLTableRowElement[], spliceIdx: number, tabTablesRight: number): SplitTableCell[][][] => {
    //No table headers
    if (tableHeadRows.length === 0) {
        return [];
    }
    //Only one level of headers
    if (tableHeadRows.length === 1) {
        const tableHeadCells = Array.from(tableHeadRows[tableHeadRows.length - 1].cells).map(cell => ({ colSpan: 1, cellText: formatText(cell.textContent) }));
        const splitCells = tableHeadCells.splice(spliceIdx);
        return [].concat([[tableHeadCells]], [[(tableHeadCells[0].cellText === '' ? [tableHeadCells[0]] : []).concat(splitCells)]]);
    }
    // Multiple levels of headers
    let tableCells: SplitTableCell[][] = [];
    let splitCells: SplitTableCell[][] = [];
    for (const headRowIdx in tableHeadRows) {
        const headRow: HTMLTableRowElement = tableHeadRows[headRowIdx];
        const headRowCells: HTMLTableCellElement[] = Array.from(headRow.cells);
        let currTableCells: SplitTableCell[] = [];
        let currSplitCells: SplitTableCell[] = [];
        let prevColSpan: number = 0;
        for (const cell of headRowCells) {
            const { colSpan } = cell;
            const { right, left } = cell.getBoundingClientRect();
            const cellText = formatText(cell.textContent)
            if (left < tabTablesRight && right <= tabTablesRight) {
                currTableCells.push({ colSpan, cellText })
            } else if (left < tabTablesRight && right > tabTablesRight && Number(headRowIdx) < tableHeadRows.length - 1) {
                const newColSpan = Number(spliceIdx) - prevColSpan;
                const splitColSpan = (prevColSpan + colSpan) - Number(spliceIdx);
                currTableCells.push({ colSpan: newColSpan, cellText });
                currSplitCells.push({ colSpan: splitColSpan, cellText });
            } else {
                currSplitCells.push({ colSpan, cellText })
            }
            prevColSpan += colSpan;
        }
        tableCells.push(currTableCells);
        splitCells.push(currSplitCells);
    }
    return [tableCells, splitCells]
}

const getSplitTableBodyCells = (tableBodyRows: HTMLTableRowElement[], spliceIdx: number, splitTableHeadCells: SplitTableCell[][][], tabTablesRight: number): SplitTableCell[][][] => {
    const repeatHeaders = splitTableHeadCells.length > 1 && splitTableHeadCells[1][splitTableHeadCells[1].length - 1][0].cellText === '' || false;
    //For each row, if repeatHeaders true, copy the first cellText along with the splicedRowCells, else just copy splicedRowCells
    const tableRowsCells: SplitTableCell[][] = []
    const splitRowsCells: SplitTableCell[][] = []
    for (const row of tableBodyRows) {
        const rowCells: SplitTableCell[] = Array.from(row.cells).map(cell => ({ cellText: formatText(cell.textContent) }));
        let splitRowCells: SplitTableCell[] = rowCells.splice(spliceIdx);
        if (repeatHeaders) {
            splitRowCells = [{ cellText: rowCells[0].cellText }, ...splitRowCells];
        }
        tableRowsCells.push(rowCells);
        splitRowsCells.push(splitRowCells);
    }
    return [tableRowsCells, splitRowsCells]
}

const buildSplitWideTablesHTML = (classSelectors: Record<string, string>, { tableWrapperClass, tableHeader, splitTableHeadCells, splitTableBodyCells }: splitWideTableMeta): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const [firstTableHeadRows, splitTableHeadRows] = splitTableHeadCells.length > 1 ? splitTableHeadCells : [[], []];
    const [firstTableBodyRows, splitTableBodyRows] = splitTableBodyCells;
    const tableTitleText = formatText(tableHeader.textContent);
    const firstTableHeadHTML: string[][] = buildTHeadHTML(firstTableHeadRows);
    const splitTableHeadHTML: string[][] = buildTHeadHTML(splitTableHeadRows);
    const firstTableBodyHTML: string[][] = buildTBodyHTML(firstTableBodyRows);
    const splitTableBodyHTML: string[][] = buildTBodyHTML(splitTableBodyRows);
    const splitTablesHTML = [
        `<div class='${tableWrapperClass}'>
            <div class='${tableContainerClass}'>
                <div class='${tableTitleClass}'>
                    ${tableTitleText}
                </div>
                <table class='${tableClass}' role='table'>
                    <thead>
                        ${firstTableHeadHTML.map((headRowCells: string[]) => `<tr>${headRowCells.join('\n')}</tr>`).join('\n')}
                    </thead>
                    <tbody>
                        ${firstTableBodyHTML.map((bodyRowCells: string[]) => `<tr>${bodyRowCells.join('\n')}</tr>`).join('\n')}
                    </tbody>
                </table>
            </div>
        </div>`.trim(),
        `<div class='${tableWrapperClass} continued-split'>
            <div class='${tableContainerClass}'>
                <div class='${tableTitleClass}'>
                    ${tableTitleText} (cont.)
                </div>
                <table class='${tableClass}' role='table'>
                    <thead>
                        ${splitTableHeadHTML.map((headRowCells: string[]) => `<tr>${headRowCells.join('\n')}</tr>`).join('\n')}
                    </thead>
                    <tbody>
                        ${splitTableBodyHTML.map((bodyRowCells: string[]) => `<tr>${bodyRowCells.join('\n')}</tr>`).join('\n')}
                    </tbody>
                </table>
            </div>
        </div>
    `.trim()];
    return splitTablesHTML;
}

const buildTHeadHTML = (tableHeadRows: SplitTableCell[][]): string[][] => {
    return tableHeadRows.reduce((headRowsHTML: string[][], tableHeadCells: SplitTableCell[]) => {
        headRowsHTML.push(tableHeadCells.map((cell: SplitTableCell): string => `<th class='trepp__tableSubHeader' tabindex='0' colspan='${cell.colSpan}' role='columnheader'>${cell.cellText}</th>`));
        return headRowsHTML;
    }, []);
}

const buildTBodyHTML = (tableBodyRows: SplitTableCell[][]): string[][] => {
    return tableBodyRows.reduce((bodyRowsHTML: string[][], tableHeadCells: SplitTableCell[]) => {
        bodyRowsHTML.push(tableHeadCells.map((cell: SplitTableCell): string => `<td class="trepp__tableData" role="cell">${cell.cellText}</td>`));
        return bodyRowsHTML;
    }, []);
}

const splitLongTables = ({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement }) => {
    const { tableWrapperClass } = classSelectors;
    const { bottom: tabTablesBottom } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    const updatedHTMLByTable: string[] = []
    for (const tableWrapper of tableWrappers) {
        const tableName = tableWrapper.className;
        const { bottom, height } = tableWrapper.getBoundingClientRect();
        if (bottom > tabTablesBottom) {
            console.log(`${tableName} has Y Overflow! Has height of ${height}, bottom of ${bottom} and exceeds tabTablesBottom of ${tabTablesBottom} by ${bottom - tabTablesBottom}`)
            const splitTableHTML: string[] = splitLongTable(classSelectors, tableWrapper, { tableBottom: bottom, tableHeight: height, tabTablesMaxHeight: tabTables.clientHeight, tabTablesBottom });
            updatedHTMLByTable.push(...splitTableHTML);
        } else {
            updatedHTMLByTable.push(tableWrapper.outerHTML)
        }
    }
    tabTables.innerHTML = updatedHTMLByTable.join('')
    handleOverflow({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }, { wideTablesHandled: true, longTablesHandled: true });
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
    return buildSplitLongTablesHTML(classSelectors, { tableWrapperClass: tableFullClass, tableHeader, tableHead, splitTableRows });
}

const buildSplitLongTablesHTML = (classSelectors: Record<string, string>, { tableWrapperClass, tableHeader, tableHead, splitTableRows }: SplitLongTableMeta): string[] => {
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

const buildAdditionalTabPages = ({ classSelectors, tab, pageHeader, pageName, tabTables, pageNum }: { classSelectors: Record<string, string>, tab: HTMLElement, pageHeader: HTMLElement, pageName: string, pageNum: number, tabTables: HTMLElement }) => {
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

const buildSplitTabTablesHTML = (classSelectors: Record<string, string>, pageNum: number, tab: HTMLElement, tabTablesPerPage: HTMLElement[][]): string[] => {
    const { tabHeaderClass, detailsClass, detailsLeftClass, detailsRightClass, addressClass, tabTablesClass, tabTitleClass } = classSelectors;
    const msaText = formatText(tab.querySelector(`.${detailsLeftClass}`).textContent)
    const addressText = formatText(tab.querySelector(`.${addressClass}`).textContent);
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
        `.trim();
    });
}

generatePDF({ pdfOptions, classSelectors });
