import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { jsPDFConstructor, jsPDFDocument } from 'jspdf-autotable';
import { opensans } from './raw_opensans';

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

type SplitWideTableMeta = {
    tableWrapperClass: string;
    tableHeader: HTMLElement;
    splitTableHeadCells: SplitTableCell[][][],
    splitTableBodyCells: SplitTableCell[][][]
}

type TabOverflowMeta = {
    classSelectors: Record<string, string>,
    tab: HTMLElement, pageHeader: HTMLElement,
    pageName?: string,
    tabTables?: HTMLElement
}

const pdfOptions = {
    pageWidth: 611,
    pageHeight: 791,
    maxTabTablesWidth: 560,
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

const getPaginatedTabsHTML = (classSelectors: Record<string, string>, pdfOutput: HTMLElement): string[] => {
    const { tabClass, tabHeaderClass, detailsClass, detailsLeftClass, detailsRightClass, addressClass, tabTitleClass, tabTablesClass } = classSelectors;
    const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    return tabs.reduce((paginatedTabsHTML: string[], currTab: HTMLElement, currTabIdx: number) => {
        const currTabClass = currTab.className;
        const image = currTab.querySelector('img');
        paginatedTabsHTML.push(`
            <div class='${currTabClass}'>
                <div class='${tabHeaderClass}'>
                    <div class='${detailsClass}'>
                        ${currTab.querySelector(`.${detailsLeftClass}`).outerHTML}
                        <div class='${detailsRightClass}'>
                            pg. ${currTabIdx + 1}
                        </div>
                    </div>
                    ${currTab.querySelector(`.${addressClass}`).outerHTML}
                </div>
                ${currTab.querySelector(`.${tabTitleClass}`).outerHTML}
                ${image ? (`<img src=${image.src} width='180px' height='180px' />`) : ''}
                ${currTab.querySelector(`.${tabTablesClass}`).outerHTML}
            </div>
        `.trim())
        return paginatedTabsHTML;
    }, [])
}


type PageNumber = number

type TablePageMeta = Map<string, PageNumber>;
type LoanDetailsPDFTableOfContents = Map<string, TablePageMeta>


const getTableOfContents = (classSelectors: any, pdfOutput: HTMLElement): LoanDetailsPDFTableOfContents[] => {
    const { tabClass, tableWrapperClass, detailsRightClass, tableTitleClass } = classSelectors;
    const maxPageHeight = 780;
    let currPageHeight = 0;
    const tocPagesMeta: LoanDetailsPDFTableOfContents[] = []
    let tableOfContents: LoanDetailsPDFTableOfContents = new Map();
    const tabPages = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    for (const tabPage of tabPages) {
        currPageHeight += 30
        //if currPageHeight is exceeded here, create new toc page with currTab and all following tabs in new tocPage
        if (currPageHeight > maxPageHeight) {
            tocPagesMeta.push(tableOfContents);
            tableOfContents = new Map() as LoanDetailsPDFTableOfContents;
            currPageHeight = 0;
        }
        const tabName = tabPage.classList[0].split(/(?=[A-Z])/).join(' ');
        const pageNum = Number(tabPage.querySelector(`.${detailsRightClass}`).textContent.split('. ')[1])
        const tabTables = Array.from(tabPage.querySelectorAll(`.${tableWrapperClass}`))
        if (!tableOfContents.get(tabName)) {
            tableOfContents.set(tabName, new Map() as TablePageMeta)
        }
        for (const tabTable of tabTables) {
            currPageHeight += 20;
            //if currPageHeight is exceeded here, create new toc page with currTab and remaining tables along with all consequent tabs being added to new page
            if (currPageHeight > maxPageHeight) {
                tocPagesMeta.push(tableOfContents)
                tableOfContents = new Map();
                tableOfContents.set(tabName, new Map() as TablePageMeta)
                currPageHeight = 0;
            }
            const tableName = formatText(tabTable.querySelector(`.${tableTitleClass}`).textContent);
            if (!tableOfContents.get(tabName).get(tableName)) {
                tableOfContents.get(tabName).set(tableName, pageNum);
            }
        }
    }
    tocPagesMeta.push(tableOfContents);
    return tocPagesMeta;
}

const addTableOfContentsToPDF = (tocByPage: LoanDetailsPDFTableOfContents[], pdf: jsPDF) => {
    // pdf.textWithLink(text, 20, y, { pageNumber: i });
    const textOptions = { charSpace: 0 }
    let pageBuffer = tocByPage.length;
    tocByPage.forEach((toc, tocIdx) => {
        pdf.addPage();
        let currX = 50
        let currY = 50;
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${tocIdx === 0 ? 'Table of Contents' : 'Table of Contents (cont.)'}`, currX, currY, textOptions);
        currX += 20;
        currY += 30;
        toc.forEach((sectionInfo, sectionName) => {
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor('#2C5CAA');
            pdf.text(sectionName, currX, currY, textOptions);
            currY += 20;
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            sectionInfo.forEach((tablePage, tableName) => {
                let dots = '.'
                let text = `${tableName} ${dots} ${`pg. ${tablePage}`}`
                while (Math.floor(pdf.getTextWidth(text)) < 470) {
                    dots = `${dots}.`
                    text = `${tableName} ${dots} ${`pg. ${tablePage}`}`
                }
                console.log('textWidth', pdf.getTextWidth(text));
                console.log('text.length', text.length)
                pdf.setTextColor('black')
                pdf.textWithLink(text, currX + 10, currY, { pageNumber: tablePage + pageBuffer + tocIdx + 1 })
                currY += 20;
            })
            currY += 10
        })
        pageBuffer -= 1;
        pdf.movePage(pdf.getNumberOfPages(), tocIdx + 2)
    })
}


export type CoverPageOptions = {
    backgroundImageSrc?: string;
    logoSrc?: string;
    textColor: string;
    textOverlayColor: string;
    textOverlayTransparency: number;
    reportTitle: string;
    reportDetails?: string[];
}

export const coverPageOpts: CoverPageOptions = {
    backgroundImageSrc: 'city.png',
    logoSrc: 'trepp-logo.png',
    textColor: '#000000',
    textOverlayColor: '#FFFFFF',
    textOverlayTransparency: 0.8,
    reportTitle: 'Details Report',
    reportDetails: ['One Vanderbilt', 'New York-Newark-Jersey City, NY-NJ-PA', 'Office'],


}

const addCoverPage = async (pdf: jsPDFDocument, coverPageOptions: CoverPageOptions, pdfOptions: any) => {
    const { pageWidth = 612, pageHeight = 792 } = pdfOptions;
    const { backgroundImageSrc, logoSrc, textOverlayColor, textColor, textOverlayTransparency, reportTitle, reportDetails } = coverPageOptions;
    await pdf.addPage();
    const html = (`
        <div>
            <img src='${backgroundImageSrc}' style='position: absolute; z-index: 0;'/>
        </div>
    `);
    await pdf.html(html, {
        autoPaging: false,
        width: pageWidth,
        windowWidth: pageWidth,
        html2canvas: {
            async: true,
            height: pageHeight,
            windowHeight: pageHeight,
            useCORS: true,
        }
    })
    pdf.saveGraphicsState();
    pdf.setGState(new pdf.GState({ opacity: 0.8 }));
    const reportTitleDimensions = pdf.getTextDimensions(reportTitle);
    const reportDetailsDimensions = pdf.getTextDimensions(reportDetails);
    console.log('reportDetailsDimensions', reportDetailsDimensions)

    pdf.setFillColor(textOverlayColor);
    pdf.rect(0, 300, 612, 200, 'F');
    pdf.restoreGraphicsState();
    pdf.addImage(logoSrc, (pageWidth - 150) / 2, pageHeight / 2.5, 150, 50);
    pdf.setFontSize(25);
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(textColor)
    pdf.text(reportTitle, (pageWidth - pdf.getTextWidth(reportTitle)) / 2, pageHeight / 2);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    const splitReportDetails = reportDetails.reduce((acc, details) => acc.concat(...pdf.splitTextToSize(details, 600)), [])
    pdf.text(splitReportDetails, pageWidth / 2 - (reportDetailsDimensions.w), pageHeight / 2 + 50);
    await pdf.movePage(pdf.getNumberOfPages(), 1)
}

const generatePDF = async ({ pdfOptions, classSelectors }: any) => {
    const { pageWidth, pageHeight } = pdfOptions;
    const { pdfClass, tabClass, tabHeaderClass, tabTitleClass, tabTablesClass } = classSelectors;
    const pdfOutput: HTMLElement = document.querySelector(`.${pdfClass}`);
    const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    for (const tab of tabs) {
        // After grabbing PDF Output, the main thing to do for each tab is to detect and handle horizontal & vertical overflow in the .tab__tables container of each tab.
        const tabHeader: HTMLElement = tab.querySelector(`.${tabHeaderClass}`);
        const tabTitle: HTMLElement = tab.querySelector(`.${tabTitleClass}`);
        const tabTables: HTMLDivElement = tab.querySelector(`.${tabTablesClass}`);
        handleOverflow({ classSelectors, tab, pageHeader: tabHeader, pageName: tabTitle.textContent, tabTables });
    }

    const paginatedTabsHTML: string[] = getPaginatedTabsHTML(classSelectors, pdfOutput);
    pdfOutput.innerHTML = paginatedTabsHTML.map(tabHTML => tabHTML).join('')
    console.log('pdfOutput.innerHTML', pdfOutput.innerHTML)
    const tableOfContentsPerPage: LoanDetailsPDFTableOfContents[] = getTableOfContents(classSelectors, pdfOutput);


    for (let tabIdx in paginatedTabsHTML) {
        await pdf.html(paginatedTabsHTML[tabIdx], {
            autoPaging: false,
            width: pageWidth - 1,
            windowWidth: pageWidth,
            html2canvas: {
                async: true,
                height: pageHeight - 1,
                windowHeight: pageHeight,
                useCORS: true,
            }
        });
        if (Number(tabIdx) < paginatedTabsHTML.length - 1) {
            pdf.addPage();
        }
    }

    const imageSrc = './city.png';
    await addCoverPage(pdf, coverPageOpts, pdfOptions);
    addTableOfContentsToPDF(tableOfContentsPerPage, pdf);
    pdf.save();
}

const isWideTablesExist = (tableWrappers: HTMLElement[], { tabTablesMaxWidth }: Boundaries) => {
    return tableWrappers && tableWrappers.some(tableWrapper => tableWrapper.scrollWidth > tabTablesMaxWidth);
}

const handleOverflow = (
    { classSelectors, tab, pageHeader, pageName }: TabOverflowMeta,
    overflowValidations = { wideTablesHandled: false, longTablesHandled: false }) => {
    const tabTables = getLatestTabTables(classSelectors, tab);
    let { wideTablesHandled, longTablesHandled } = overflowValidations;
    let { clientWidth: tabTablesClientWidth, clientHeight: tabTablesClientHeight, scrollWidth: tabTablesScrollWidth, scrollHeight: tabTablesScrollHeight } = tabTables;

    // No image and no overflow exists and no DOM Manipulation needed, skip!
    if (tabTablesClientWidth === tabTablesScrollWidth && tabTablesClientHeight === tabTablesScrollHeight) {
        return;
    }
    //Handle Tables that are too wide
    if (tabTablesClientWidth < tabTablesScrollWidth && !wideTablesHandled) {
        splitWideTables({ classSelectors, tab, pageHeader, pageName, tabTables }, { tabTablesMaxWidth: tabTablesClientWidth });
    } else {
        wideTablesHandled = true;
    }
    //Handle Tables that are too long
    if (tabTablesClientHeight < tabTablesScrollHeight && wideTablesHandled && !longTablesHandled) {
        splitLongTables({ classSelectors, tab, pageHeader, pageName, tabTables })
    } else {
        longTablesHandled = true;
    }
    //Handle Tabs containing too many tables to fit into one page
    if (tabTablesClientWidth < tabTablesScrollWidth && wideTablesHandled && longTablesHandled) {
        buildAdditionalTabPages({ classSelectors, tab, pageHeader, pageName, tabTables })
    }
}

const getLatestTabTables = (classSelectors: Record<string, string>, tab: HTMLElement): HTMLElement => tab.querySelector(`.${classSelectors.tabTablesClass}`)

const splitWideTables = ({ classSelectors, tab, pageHeader, pageName, tabTables }: TabOverflowMeta, { tabTablesMaxWidth }: Boundaries) => {
    const { tableWrapperClass } = classSelectors
    const { right: tabTablesRight } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    const updatedHTMLByTable: string[] = []
    if (isWideTablesExist(tableWrappers, { tabTablesMaxWidth })) {
        for (const tableWrapper of tableWrappers) {
            const { left: wrapperLeft } = tableWrapper.getBoundingClientRect();
            const maxRight = wrapperLeft < tabTablesRight ? tabTablesRight : wrapperLeft + tabTablesMaxWidth;
            const { right } = tableWrapper.getBoundingClientRect();
            if (right > maxRight) {
                const splitTableHTML = splitWideTable(classSelectors, tableWrapper, { tabTablesMaxWidth: tabTables.clientWidth, tabTablesRight: maxRight });
                updatedHTMLByTable.push(...splitTableHTML);
            } else {
                updatedHTMLByTable.push(tableWrapper.outerHTML);
            }
        }
        tabTables.innerHTML = updatedHTMLByTable.join('')
    }
    handleOverflow({ classSelectors, tab, pageHeader, pageName, tabTables }, { wideTablesHandled: true, longTablesHandled: false });
}

const splitWideTable = (classSelectors: Record<string, string>, tableWrapper: HTMLElement, { tabTablesRight }: Boundaries): string[] => {
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
    const splitTableBodyCells: SplitTableCell[][][] = getSplitTableBodyCells(tableBodyRows, spliceIdx, splitTableHeadCells);
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
        return [].concat([[tableHeadCells]], [[[(tableHeadCells[0])].concat(splitCells)]]);
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

const getSplitTableBodyCells = (tableBodyRows: HTMLTableRowElement[], spliceIdx: number, splitTableHeadCells: SplitTableCell[][][]): SplitTableCell[][][] => {
    const repeatHeaders = splitTableHeadCells.length === 0 || splitTableHeadCells[0].length === 1;
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

const buildSplitWideTablesHTML = (classSelectors: Record<string, string>, { tableWrapperClass, tableHeader, splitTableHeadCells, splitTableBodyCells }: SplitWideTableMeta): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const [firstTableHeadRows, splitTableHeadRows] = splitTableHeadCells.length > 1 ? splitTableHeadCells : [[], []];
    const [firstTableBodyRows, splitTableBodyRows] = splitTableBodyCells;
    const tableTitleText = formatText(tableHeader.textContent);
    const firstTableHeadHTML: string[][] = buildTHeadHTML(firstTableHeadRows);
    const splitTableHeadHTML: string[][] = buildTHeadHTML(splitTableHeadRows);
    const firstTableBodyHTML: string[][] = buildTBodyHTML(firstTableBodyRows);
    const splitTableBodyHTML: string[][] = buildTBodyHTML(splitTableBodyRows);
    // TODO: We need to pass a max width and split the wide table further if needed
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

const splitLongTables = ({ classSelectors, tab, pageHeader, pageName, tabTables }: TabOverflowMeta) => {
    const { tableWrapperClass } = classSelectors;
    const { bottom: tabTablesBottom } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    const updatedHTMLByTable: string[] = []
    const image = tab.querySelector('img');
    for (const tableWrapper of tableWrappers) {
        const { bottom, height } = tableWrapper.getBoundingClientRect();
        if (bottom > tabTablesBottom) {
            const splitTableHTML: string[] = splitLongTable(classSelectors, tableWrapper, tab, { tableBottom: bottom, tableHeight: height, tabTablesMaxHeight: tabTables.clientHeight, tabTablesBottom });
            updatedHTMLByTable.push(...splitTableHTML);
        } else {
            updatedHTMLByTable.push(tableWrapper.outerHTML)
        }
    }
    tabTables.innerHTML = image ? `<img src='${image.src}'/>${updatedHTMLByTable.join('')}` : updatedHTMLByTable.join('');
    handleOverflow({ classSelectors, tab, pageHeader, pageName, tabTables }, { wideTablesHandled: true, longTablesHandled: true });
}

const splitLongTable = (classSelectors: Record<string, string>, tableWrapper: HTMLElement, tab: any, { tabTablesMaxHeight, tabTablesBottom }: Boundaries): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableFullClass: string = tableWrapper.className;
    const tableContainer: HTMLElement = tableWrapper.querySelector(`.${tableContainerClass}`);
    const tableHeader: HTMLElement = tableContainer.querySelector(`.${tableTitleClass}`);
    const table: HTMLTableElement = tableContainer.querySelector(`.${tableClass}`);
    const tableHead: HTMLTableSectionElement = table.tHead;
    const image = tab.querySelector('img');
    const maxRowHeight: number = tabTablesMaxHeight - tableHeader.clientHeight - tableHead.clientHeight
    const tableBody: HTMLTableSectionElement = table.tBodies[0];
    const tableBodyRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
    // Find the first row whose bottom exceeds tabTablesBottom. This is the row that we need to start the split from
    const spliceIdx: number = tableBodyRows.findIndex((row: HTMLTableRowElement) => row.getBoundingClientRect().bottom > tabTablesBottom)
    const splicedRows: HTMLTableRowElement[] = tableBodyRows.splice(spliceIdx - 1);
    const splitTableRows: HTMLTableRowElement[][] = [tableBodyRows];
    let currSplitTableRows: HTMLTableRowElement[] = [];
    let currRowHeight: number = tableHeader.clientHeight + tableHead.clientHeight;
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

const buildAdditionalTabPages = ({ classSelectors, tab, tabTables }: TabOverflowMeta) => {
    const { tableWrapperClass } = classSelectors
    const { bottom: tabBottom } = tab.getBoundingClientRect();
    const { right: tabTablesRight, bottom: tabTablesBottom } = tabTables.getBoundingClientRect();
    const tableWrappers: HTMLElement[] = Array.from(tabTables.getElementsByClassName(`${tableWrapperClass}`)) as HTMLElement[];
    //Find the index of the first horizontal overflowing table;
    let spliceIdx = -1;
    for (const tableWrapperIdx in tableWrappers) {
        const tableWrapper = tableWrappers[tableWrapperIdx];
        const { right, bottom } = tableWrapper.getBoundingClientRect();
        if (right > tabTablesRight || bottom > tabBottom) {
            spliceIdx = Number(tableWrapperIdx);
            break;
        }
    }
    if (spliceIdx === -1) return;
    const splitTableWrappers = tableWrappers.splice(spliceIdx);
    const tabTablesPerPage: HTMLElement[][] = getTabTablesPerPage(tableWrappers, splitTableWrappers, { tabTablesMaxWidth: tabTables.clientWidth });
    const tabTablesHTML: string[] = buildSplitTabTablesHTML(classSelectors, tab, tabTablesPerPage);
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

const buildSplitTabTablesHTML = (classSelectors: Record<string, string>, tab: HTMLElement, tabTablesPerPage: HTMLElement[][]): string[] => {
    const { tabHeaderClass, detailsClass, detailsLeftClass, detailsRightClass, addressClass, tabTablesClass, tabTitleClass } = classSelectors;
    const msaText = formatText(tab.querySelector(`.${detailsLeftClass}`).textContent)
    const addressText = formatText(tab.querySelector(`.${addressClass}`).textContent);
    const titleText = tab.querySelector(`.${tabTitleClass}`).textContent.trim();
    //We need to break down the original x overflowing tab into one or more additional tabPages        
    const image = tab.querySelector('img');
    return tabTablesPerPage.map((pageTables, pageIdx) => {
        return `
            <div class='${tab.className} ${pageIdx > 0 ? `continued-${pageIdx}` : ''}'>
                <div class='${tabHeaderClass}'>
                    <div class='${detailsClass}'>
                        <div class='${detailsLeftClass}'>
                            ${msaText}
                        </div>
                        <div class='${detailsRightClass}'>
                            pg.
                        </div>
                    </div>
                    <div class='${addressClass}'>
                        ${addressText}
                    </div>
                </div>
                <div class='${tabTitleClass}'>               
                ${titleText} ${pageIdx > 0 ? `(cont.)` : ''}
                </div>
                ${(pageIdx === 0 && image ? `<img src=${image.src} width='200px' height='200px' />` : '')}
                <div class='${tabTablesClass}'>
                    ${pageTables.map(table => table.outerHTML).join('')}
                </div>
            </div>
        `.trim();
    });
}

generatePDF({ pdfOptions, classSelectors });

// src="http://www.google.com/maps/api/staticmap?center=47.67681,-122.09707&zoom=14&size=200x200&sensor=false&maptype=roadmap&format=png&markers=size:small|label:S|color:0x932a8e|47.6768,-122.0971&client=gme-trepp&signature=MXy7QCE93qdbPC1Gt1CT61LJ9Ow="