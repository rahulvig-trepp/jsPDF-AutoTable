import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { jsPDFConstructor, jsPDFDocument } from 'jspdf-autotable';
import { opensans } from './raw_opensans';


const pdf = new jsPDF('p', 'pt', 'letter')



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


type Boundaries = {
    tableBottom?: number;
    tableRight?: number;
    tableWidth?: number;
    tableHeight?: number;
    tabTablesMaxWidth?: number;
    tabTablesMaxHeight?: number;
    tabTablesBottom?: number;
    tabTablesRight?: number;
    chartBuffer?: number;
};

type SplitTableCell = {
    colSpan?: number;
    cellText: string;
};

type SplitLongTableMeta = {
    tableWrapperClass: string;
    tableHeader: HTMLElement;
    tableHead: HTMLTableSectionElement;
    splitTableRows: HTMLTableRowElement[][];
};

type SplitWideTableMeta = {
    tableWrapperClass: string;
    tableHeader: HTMLElement;
    splitTableHeads: SplitTableCell[][][];
    splitTableBodies: SplitTableCell[][][];
};

type TabOverflowMeta = {
    classSelectors: Record<string, string>;
    tab: HTMLElement;
    pageHeader: HTMLElement;
    pageName?: string;
    tabTables?: HTMLElement;
};

export const pdfOptions = {
    pageWidth: 611,
    pageHeight: 791,
    maxTabTablesWidth: 560,
    maxTabTablesHeight: 670,
    tableOfContentOpts: {
        maxNumTables: 40,
        sectionGap: 20,
        linkGap: 15,
        headerColor: 'black',
        sectionColor: '#2C5CAA',
        tableLinkColor: 'gray',
        defaultFontArgs: ['helvetica', 'bold'],
        linkFontArgs: ['helvetica', 'normal'],
        headerFontSize: 11,
        sectionFontSize: 9,
        linkFontSize: 8,
    },
};

export const formatText = (text: string): string => {
    return text.replace(/\s+/g, ' ');
};

export const splitSection = (sectionRows: HTMLTableRowElement[], startIdx: number, spliceIdx: number = undefined) => sectionRows.reduce((splicedRows: any[], row: HTMLTableRowElement) => [...splicedRows, Array.from(row.cells).slice(startIdx, spliceIdx).map(({ textContent = '' }) => ({ cellText: formatText(textContent) }))], [])

const getSplitTableSections = (section: HTMLTableRowElement[], spliceIndices: number[], totalRowLen: number) => {
    const splitTableSections: SplitTableCell[][][] = [];
    let startIdx = 0;
    spliceIndices.forEach(spliceIdx => {
        splitTableSections.push(splitSection(section, startIdx, spliceIdx));
        startIdx = spliceIdx;
    });
    splitTableSections.push(splitSection(section, startIdx));
    return splitTableSections;
}

const addPinnedColumnCells = (splitSection: SplitTableCell[][][], pinnedColCells: HTMLTableCellElement[]) => {
    splitSection.forEach((splitTableBodyRows, tableIdx) => {
        if (tableIdx > 0) {
            for (const rowIdx in splitTableBodyRows) {
                splitTableBodyRows[rowIdx] = [{ cellText: formatText(pinnedColCells[rowIdx].textContent || '') }, ...splitTableBodyRows[rowIdx]];
            }
        }
    })
}

type PageNumber = number;

type TablePageMeta = Map<string, PageNumber>;
export type LoanDetailsPDFTableOfContents = Map<string, TablePageMeta>;


type SplitTableConfig = {
    tableHeadRows?: HTMLTableRowElement[]
    tableBodyRows?: HTMLTableRowElement[];
    validationRowCells: HTMLTableCellElement[];
    spliceIndices: number[];
    splitTableHeads?: SplitTableCell[][][];
    pinnedColHeadCells?: HTMLTableCellElement[]
    pinnedColBodyCells?: HTMLTableCellElement[]
}


export const getTableOfContents = (
    classSelectors: any,
    pdfOutput: HTMLElement,
    opts: { maxNumTables: any; },
): LoanDetailsPDFTableOfContents[] => {
    const { maxNumTables } = opts;
    const { tabClass, tableWrapperClass, detailsRightClass, tableTitleClass } = classSelectors;
    const tocPagesMeta: LoanDetailsPDFTableOfContents[] = [];
    let tableOfContents: LoanDetailsPDFTableOfContents = new Map();
    const tabPages: HTMLElement[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    let currNumTables = 0;
    const numSameNameTablesCountMap: Record<string, number> = {};
    for (const tabPage of tabPages) {
        //if currNumTables is exceeded here, create new toc page with currTab and all following tabs in new tocPage
        if (currNumTables >= maxNumTables) {
            tocPagesMeta.push(tableOfContents);
            tableOfContents = new Map() as LoanDetailsPDFTableOfContents;
            currNumTables = 0;
        }
        const tabName = tabPage.classList[0].split(/(?=[A-Z])/).join(' ');
        const pageNum = Number((tabPage.querySelector(`.${detailsRightClass}`) as any)?.textContent.split('. ')[1]);
        const tabTables = Array.from(tabPage.querySelectorAll(`.${tableWrapperClass}`));
        if (!tableOfContents.get(tabName)) {
            tableOfContents.set(tabName, new Map() as TablePageMeta);
        }
        for (const tabTable of tabTables) {
            //if currNumTables is exceeded here, create new toc page with currTab and remaining tables along with all consequent tabs being added to new page
            if (currNumTables >= maxNumTables) {
                tocPagesMeta.push(tableOfContents);
                tableOfContents = new Map() as LoanDetailsPDFTableOfContents;
                tableOfContents.set(tabName, new Map() as TablePageMeta);
                currNumTables = 0;
            }
            const tableName = formatText(tabTable.querySelector(`.${tableTitleClass}`)?.textContent || '');
            if (!tableOfContents?.get(tabName)?.get(tableName)) {
                tableOfContents
                    ?.get(tabName)
                    ?.set(
                        numSameNameTablesCountMap?.[tableName] ? `${tableName} ${numSameNameTablesCountMap[tableName]}` : tableName,
                        pageNum,
                    );
                numSameNameTablesCountMap[tableName] = numSameNameTablesCountMap[tableName] + 1 || 1;
            } else {
                tableOfContents?.get(tabName)?.set(`${tableName} ${numSameNameTablesCountMap[tableName]}`, pageNum);
                numSameNameTablesCountMap[tableName] = numSameNameTablesCountMap[tableName] + 1;
            }
            currNumTables += 1;
        }
    }
    tocPagesMeta.push(tableOfContents);
    return tocPagesMeta;
};

export const addTableOfContentsToPDF = (tocByPage: LoanDetailsPDFTableOfContents[], pdf: any, opts: { headerColor: any; sectionColor: any; tableLinkColor: any; defaultFontArgs: any; linkFontArgs: any; headerFontSize: any; sectionFontSize: any; linkFontSize: any; linkGap: any; sectionGap: any; }) => {
    const {
        headerColor,
        sectionColor,
        tableLinkColor,
        defaultFontArgs,
        linkFontArgs,
        headerFontSize,
        sectionFontSize,
        linkFontSize,
        linkGap,
        sectionGap,
    } = opts;
    let pageBuffer = tocByPage.length;
    tocByPage.forEach((toc, tocIdx) => {
        pdf.addPage();
        let currX = 50;
        let currY = 50;
        pdf.setFontSize(headerFontSize);
        pdf.setTextColor(headerColor);
        pdf.setFont(...defaultFontArgs);
        pdf.text(`${tocIdx === 0 ? 'Table of Contents' : 'Table of Contents (cont.)'}`, currX, currY);
        currX += sectionGap;
        toc.forEach((sectionInfo, sectionName) => {
            currY += sectionGap;
            pdf.setFontSize(sectionFontSize);
            pdf.setFont(...defaultFontArgs);
            pdf.setTextColor(sectionColor);
            pdf.text(sectionName, currX, currY);
            pdf.setFontSize(linkFontSize);
            pdf.setFont(...linkFontArgs);
            sectionInfo.forEach((tablePage, tableName) => {
                currY += linkGap;
                let dots = '.';
                let text = `${tableName} ${dots} ${`pg. ${tablePage}`}`;
                while (Math.floor(pdf.getTextWidth(text)) < 470) {
                    dots = `${dots}.`;
                    text = `${tableName} ${dots} ${`pg. ${tablePage}`}`;
                }
                pdf.setTextColor(tableLinkColor);
                pdf.textWithLink(text.trim(), currX + 10, currY, { pageNumber: tablePage + pageBuffer + tocIdx + 1 });
            });
        });
        pageBuffer -= 1;
        pdf.movePage(pdf.getNumberOfPages(), tocIdx + 2);
    });
};

export const getPaginatedTabsHTML = (classSelectors: Record<string, string>, pdfOutput: HTMLElement): string[] => {
    const {
        tabClass,
        tabHeaderClass,
        detailsClass,
        detailsLeftClass,
        detailsRightClass,
        addressClass,
        tabTitleClass,
        tabTablesClass,
        tabChartsClass,
        tabChartClass,
    } = classSelectors;
    const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    return tabs.reduce((paginatedTabsHTML: string[], currTab: HTMLElement, currTabIdx: number) => {
        const msa = formatText(currTab.querySelector(`.${detailsLeftClass}`)?.textContent || '').trim();
        const address = formatText(currTab.querySelector(`.${addressClass}`)?.textContent || '').trim();
        const currTabClass = currTab.className;
        const charts = Array.from(currTab.querySelectorAll(`.${tabChartClass}`));
        paginatedTabsHTML.push(
            formatText(`
        <div class='LoanDetailsPDFView'>          
          <div class='pdf-output'>
            <div class='${currTabClass}'>
            <div class='${tabHeaderClass}'>
                <div class='${detailsClass}'>
                    <div class='${detailsLeftClass}'>
                      ${msa}
                    </div>
                    <div class='${detailsRightClass}'>
                        pg. ${currTabIdx + 1}
                    </div>
                </div>
                <div class='${addressClass}'>
                  ${address}
                </div>
            </div>
            ${currTab.querySelector(`.${tabTitleClass}`)?.outerHTML}
            ${charts && charts?.length
                    ? charts
                        .map(
                            (chart: any) => `<div class='${tabChartsClass}'>
                  <img class='${tabChartClass}' src='${chart?.src}' width='560px' height='180px'/>
                </div>`,
                        )
                        .join(' ')
                    : ''
                }
            <div class='tab__tables' style='font-size: 7px;'>
              ${currTab.querySelector(`.${tabTablesClass}`)?.innerHTML}
            </div>
            </div>
          </div>
        </div>
        `),
        );
        return paginatedTabsHTML;
    }, []);
};

export const isWideTablesExist = (tableWrappers: HTMLElement[], { tabTablesMaxWidth }: Boundaries) => {
    return (
        tableWrappers && tableWrappers.some((tableWrapper) => tableWrapper.scrollWidth > (tabTablesMaxWidth as number))
    );
};

export const handleOverflow = (
    { classSelectors, tab, pageHeader, pageName }: TabOverflowMeta,
    overflowValidations = { wideTablesHandled: false, longTablesHandled: false },
) => {
    const tabTables = getLatestTabTables(classSelectors, tab);
    let { wideTablesHandled, longTablesHandled } = overflowValidations;
    const {
        clientWidth: tabTablesClientWidth,
        clientHeight: tabTablesClientHeight,
        scrollWidth: tabTablesScrollWidth,
        scrollHeight: tabTablesScrollHeight,
    } = tabTables;
    // No overflow exists and no DOM Manipulation needed, skip!
    if (tabTablesClientWidth === tabTablesScrollWidth && tabTablesClientHeight === tabTablesScrollHeight) {
        return;
    }
    //Handle Tables that are too wide
    if (tabTablesClientWidth < tabTablesScrollWidth && !wideTablesHandled) {
        splitWideTables(
            { classSelectors, tab, pageHeader, pageName, tabTables },
            { tabTablesMaxWidth: tabTablesClientWidth },
        );
    } else {
        wideTablesHandled = true;
    }
    //Handle Tables that are too long
    if (tabTablesClientHeight < tabTablesScrollHeight && wideTablesHandled && !longTablesHandled) {
        splitLongTables({ classSelectors, tab, pageHeader, pageName, tabTables });
    } else {
        longTablesHandled = true;
    }
    //Handle Tabs containing too many tables to fit into one page
    if (tabTablesClientWidth < tabTablesScrollWidth && wideTablesHandled && longTablesHandled) {
        buildAdditionalTabPages({ classSelectors, tab, pageHeader, pageName, tabTables });
    }
};

export const getLatestTabTables = (classSelectors: Record<string, string>, tab: HTMLElement): HTMLElement =>
    tab.querySelector(`.${classSelectors.tabTablesClass}`) as HTMLElement;

export const splitWideTables = (
    { classSelectors, tab, pageHeader, pageName, tabTables }: TabOverflowMeta,
    { tabTablesMaxWidth }: any,
) => {
    const { tableWrapperClass } = classSelectors;
    const { right: tabTablesRight }: any = tabTables?.getBoundingClientRect() || {};
    const tableWrappers: HTMLElement[] = Array.from(
        tabTables?.getElementsByClassName(`${tableWrapperClass}`) as HTMLCollection,
    ) as HTMLElement[];
    const updatedHTMLByTable: string[] = [];
    if (isWideTablesExist(tableWrappers, { tabTablesMaxWidth })) {
        for (const tableWrapper of tableWrappers) {
            if (tableWrapper.scrollWidth >= tabTablesMaxWidth) {
                const splitTableHTML = splitWideTable(classSelectors, tableWrapper, {
                    tabTablesMaxWidth
                });
                updatedHTMLByTable.push(...splitTableHTML);
            } else {
                updatedHTMLByTable.push(tableWrapper.outerHTML);
            }
        }
        (tabTables as HTMLElement).innerHTML = updatedHTMLByTable.join('');
    }
    handleOverflow(
        { classSelectors, tab, pageHeader, pageName, tabTables },
        { wideTablesHandled: true, longTablesHandled: false },
    );
};

export const splitWideTable = (
    classSelectors: Record<string, string>,
    tableWrapper: HTMLElement,
    { tabTablesMaxWidth }: any,
): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableFullClass: string = tableWrapper.className;
    const tableContainer: HTMLElement = tableWrapper?.querySelector(`.${tableContainerClass}`) as HTMLElement;
    const tableHeader: HTMLElement = tableContainer?.querySelector(`.${tableTitleClass}`) as HTMLElement;
    const table: HTMLTableElement = tableContainer?.querySelector(`.${tableClass}`) as HTMLTableElement;
    const tableHead: HTMLTableSectionElement = table?.tHead as HTMLTableSectionElement;
    const tableHeadRows: HTMLTableRowElement[] = Array.from(tableHead.rows);
    const tableBody: HTMLTableSectionElement = table.tBodies[0];
    const tableBodyRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
    const validationRowCells: HTMLTableCellElement[] = Array.from(tableBodyRows[0].cells);
    let pinnedColumnWidth = validationRowCells[0].getBoundingClientRect().width;

    const pinnedColHeadCells: HTMLTableCellElement[] = Array.from(table.querySelectorAll('th:first-child'));
    const pinnedColBodyCells: HTMLTableCellElement[] = Array.from(table.querySelectorAll('td:first-child'));
    let currSplitTableWidth = 0;
    const spliceIndices = validationRowCells.reduce((indices: number[], cell: HTMLTableCellElement, cellIdx: number) => {
        const cellWidth = cell.getBoundingClientRect().width;
        if (cellWidth + currSplitTableWidth > (tabTablesMaxWidth - pinnedColumnWidth)) {
            // Set to pinnedColumnWidth and not 0 bc we need to repeat first column on each new split table.
            currSplitTableWidth = pinnedColumnWidth;
            return [...indices, cellIdx];
        }
        currSplitTableWidth += cellWidth;
        return indices;
    }, [])
    const splitTableHeads: SplitTableCell[][][] = getSplitTableHeads({
        tableHeadRows,
        spliceIndices,
        validationRowCells,
        pinnedColHeadCells,
    })
    const splitTableBodies: SplitTableCell[][][] = getSplitTableBodies({
        tableBodyRows,
        spliceIndices,
        tableHeadRows,
        validationRowCells,
        pinnedColBodyCells,
    });
    return buildSplitWideTablesHTML(classSelectors, {
        tableWrapperClass: tableFullClass,
        tableHeader,
        splitTableHeads,
        splitTableBodies,
    });
};

export const getSplitTableHeads = ({
    tableHeadRows,
    spliceIndices,
    validationRowCells,
    pinnedColHeadCells,
}: SplitTableConfig): SplitTableCell[][][] => {
    // No table headers
    if (tableHeadRows.length === 0) {
        return [];
    }
    // Only one level of headers
    let splitTableHeads: SplitTableCell[][][];
    if (tableHeadRows.length === 1) {
        splitTableHeads = getSplitTableSections(tableHeadRows, spliceIndices, validationRowCells.length);
        addPinnedColumnCells(splitTableHeads, pinnedColHeadCells);
        return splitTableHeads;
    }
    splitTableHeads = [...getSplitTableSections([tableHeadRows[tableHeadRows.length - 1]], spliceIndices, validationRowCells.length)];
    const spanningHeaderRows = tableHeadRows.slice(0, tableHeadRows.length - 1).reverse();
    for (const headerRowIdx in spanningHeaderRows) {
        const spanningCols = Array.from(spanningHeaderRows[headerRowIdx].cells).map(({ colSpan, textContent }) => ({ colSpan, cellText: textContent })).reverse();
        let currColGroup = spanningCols[spanningCols.length - 1];
        for (const splitHeadIdx in splitTableHeads) {
            const [headerCells] = splitTableHeads[splitHeadIdx];
            let spanRemaining = Number(headerRowIdx) == 0 ? headerCells.length : headerCells.reduce((totalSpan, { colSpan }) => {
                totalSpan += colSpan;
                return totalSpan;
            }, 0);
            if (currColGroup.colSpan >= spanRemaining) {
                currColGroup.colSpan -= spanRemaining;
                splitTableHeads[splitHeadIdx] = [[{ colSpan: spanRemaining, cellText: currColGroup.cellText }], ...splitTableHeads[splitHeadIdx]];
            } else {
                let groupsToAdd: SplitTableCell[] = []
                while (spanRemaining > 0) {
                    if (currColGroup.colSpan >= spanRemaining) {
                        currColGroup.colSpan -= spanRemaining;
                        groupsToAdd = [...groupsToAdd, { colSpan: spanRemaining, cellText: currColGroup.cellText }];
                        break;
                    } else {
                        spanRemaining -= currColGroup.colSpan;
                        groupsToAdd.push({ cellText: currColGroup.cellText, colSpan: currColGroup.colSpan })
                        spanningCols.pop();
                        currColGroup = spanningCols[spanningCols.length - 1];
                    }
                }
                splitTableHeads[splitHeadIdx] = [groupsToAdd, ...splitTableHeads[splitHeadIdx]]
            }
        }
    }
    return splitTableHeads;
};

export const getSplitTableBodies = ({
    tableBodyRows,
    spliceIndices,
    validationRowCells,
    tableHeadRows,
    pinnedColBodyCells
}: SplitTableConfig): SplitTableCell[][][] => {
    const repeatPinnedColumn = tableHeadRows.length < 2;
    const splitTableBodies: SplitTableCell[][][] = getSplitTableSections(tableBodyRows, spliceIndices, validationRowCells.length)
    if (repeatPinnedColumn) {
        addPinnedColumnCells(splitTableBodies, pinnedColBodyCells)
    }
    return splitTableBodies;
};

export const buildSplitWideTablesHTML = (
    classSelectors: Record<string, string>,
    { tableWrapperClass, tableHeader, splitTableHeads, splitTableBodies }: SplitWideTableMeta,
): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableTitleText = formatText(tableHeader?.textContent || '');
    const splitHeadsHTML = splitTableHeads?.map(splitTableRows => formatText(`
        ${splitTableRows.map(splitTableRow => (`
            <tr>
                ${splitTableRow.map(({ cellText = '', colSpan = 1 }) => (`
                    <th class='trepp__tableSubHeader' tabindex='0' colspan='${colSpan}' role='columnheader'> ${cellText} </th>
                `)).join('')}
            </tr>
        `)).join('')}
    `));
    const splitBodiesHTML = splitTableBodies.map(splitTableRows => (`
        ${splitTableRows.map(splitTableRow => (`
            <tr>
                ${splitTableRow.map(({ cellText = '' }) => (`
                    <td class="trepp__tableData" role="cell"> ${cellText} </td>
                `)).join('')}
            </tr>
        `)).join('')}
    `))
    return Array.from({ length: splitBodiesHTML.length }, (_, idx) => idx).map(splitTableIdx => (`
        <div class='${tableWrapperClass}' split-${splitTableIdx}>
            <div class='${tableContainerClass}'>
                <div class='${tableTitleClass}'>
                    ${tableTitleText} ${splitTableIdx > 0 ? '(cont.)' : ''}
                </div>
                <table class='${tableClass}' role='table'>
                    <thead>
                        ${splitHeadsHTML && splitHeadsHTML[splitTableIdx] || ''}
                    </thead>
                    <tbody>
                        ${splitBodiesHTML[splitTableIdx]}
                    </tbody>
                </table>
            </div>
        </div>
    `));
};

export const splitLongTables = ({ classSelectors, tab, pageHeader, pageName, tabTables }: TabOverflowMeta) => {
    const { tableWrapperClass } = classSelectors;
    const { bottom: tabTablesBottom }: any = tabTables?.getBoundingClientRect() || {};
    const tableWrappers: HTMLElement[] = Array.from(
        tabTables?.getElementsByClassName(`${tableWrapperClass}`) as HTMLCollection,
    ) as HTMLElement[];
    const updatedHTMLByTable: string[] = [];
    for (const tableWrapper of tableWrappers) {
        const { bottom } = tableWrapper.getBoundingClientRect();
        if (bottom > tabTablesBottom) {
            const splitTableHTML: string[] = splitLongTable(classSelectors, tableWrapper, tab, {
                tabTablesMaxHeight: tabTables?.clientHeight,
                tabTablesBottom,
            });
            updatedHTMLByTable.push(...splitTableHTML);
        } else {
            updatedHTMLByTable.push(tableWrapper.outerHTML);
        }
    }
    (tabTables as HTMLElement).innerHTML = updatedHTMLByTable.join('');
    handleOverflow(
        { classSelectors, tab, pageHeader, pageName, tabTables },
        { wideTablesHandled: true, longTablesHandled: true },
    );
};

export const splitLongTable = (
    classSelectors: Record<string, string>,
    tableWrapper: HTMLElement,
    tab: HTMLElement,
    { tabTablesMaxHeight, tabTablesBottom, chartBuffer = 170 }: any,
    tabsWithCharts = ['Property'],
): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    const tableFullClass: string = tableWrapper.className;
    const tableContainer: HTMLElement = tableWrapper.querySelector(`.${tableContainerClass}`) as HTMLElement;
    const tableHeader: HTMLElement = tableContainer.querySelector(`.${tableTitleClass}`) as HTMLElement;
    const table: HTMLTableElement = tableContainer.querySelector(`.${tableClass}`) as HTMLTableElement;
    const tableHead: HTMLTableSectionElement = table.tHead as HTMLTableSectionElement;
    const hasChart = tabsWithCharts.includes(tab.classList[0].trim());
    const maxRowHeight: number =
        tabTablesMaxHeight - tableHeader.clientHeight - tableHead.clientHeight + (hasChart ? chartBuffer : 0);
    const tableBody: HTMLTableSectionElement = table.tBodies[0];
    const tableBodyRows: HTMLTableRowElement[] = Array.from(tableBody.rows);
    // Find the first row whose bottom exceeds tabTablesBottom. This is the row that we need to start the split from
    const spliceIdx: number = tableBodyRows.findIndex(
        (row: HTMLTableRowElement) => row.getBoundingClientRect().bottom > tabTablesBottom + (hasChart ? chartBuffer : 0),
    );
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
    return buildSplitLongTablesHTML(classSelectors, {
        tableWrapperClass: tableFullClass,
        tableHeader,
        tableHead,
        splitTableRows,
    });
};

export const buildSplitLongTablesHTML = (
    classSelectors: Record<string, string>,
    { tableWrapperClass, tableHeader, tableHead, splitTableRows }: SplitLongTableMeta,
): string[] => {
    const { tableContainerClass, tableTitleClass, tableClass } = classSelectors;
    return splitTableRows.reduce((splitTablesHTML: string[], tableRows, tableIdx): string[] => {
        const tableHeaderText = tableHeader.textContent;
        const header =
            tableIdx > 0 && !tableHeaderText?.includes('(cont.)') ? `${tableHeaderText} (cont.)` : tableHeaderText;
        const tableHTML = `
            <div class='${tableWrapperClass} ${tableIdx > 0 ? `continued-long ${tableIdx}` : ''}' style='font-size: 7px;'>
                <div class='${tableContainerClass}' style='font-size: 7px;'>
                    <div class='${tableTitleClass}'>
                        ${header}
                    </div>
                    <table class='${tableClass}' role='table' style='font-size: 7px;'>
                        ${tableHead.outerHTML}
                        <tbody>
                            ${tableRows.map((row) => row.outerHTML).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        splitTablesHTML.push(tableHTML);
        return splitTablesHTML;
    }, []);
};

export const buildAdditionalTabPages = ({ classSelectors, tab, tabTables }: TabOverflowMeta) => {
    const { tableWrapperClass } = classSelectors;
    const { right: tabTablesRight }: any = tabTables?.getBoundingClientRect() || {};
    const tableWrappers: HTMLElement[] = Array.from(
        tabTables?.getElementsByClassName(`${tableWrapperClass}`) as HTMLCollection,
    ) as HTMLElement[];
    //Find the index of the first horizontal overflowing table;
    let spliceIdx = -1;
    for (const tableWrapperIdx in tableWrappers) {
        const tableWrapper = tableWrappers[tableWrapperIdx];
        const { right } = tableWrapper.getBoundingClientRect();
        if (right > tabTablesRight) {
            spliceIdx = Number(tableWrapperIdx);
            break;
        }
    }
    if (spliceIdx === -1) return;
    const splitTableWrappers = tableWrappers.splice(spliceIdx);
    const tabTablesPerPage: HTMLElement[][] = getTabTablesPerPage(tableWrappers, splitTableWrappers, {
        tabTablesMaxWidth: tabTables?.clientWidth,
    });
    const tabTablesHTML: string[] = buildSplitTabTablesHTML(classSelectors, tab, tabTablesPerPage);
    tab.outerHTML = Array.from(tabTablesHTML)
        .map((pageHTML) => pageHTML)
        .join('');
};

export const getTabTablesPerPage = (
    tableWrappers: HTMLElement[],
    splitTableWrappers: HTMLElement[],
    { tabTablesMaxWidth }: any,
): HTMLElement[][] => {
    //We need to iterate through all the splitTableWrappers and add them to currPageTables until width is exceeded.
    const tabTablesPerPage: HTMLElement[][] = [tableWrappers];
    let currPageTables: HTMLElement[] = [];
    let maxRight = splitTableWrappers[0].getBoundingClientRect().left + tabTablesMaxWidth;
    splitTableWrappers.forEach((tableWrapper) => {
        if (tableWrapper.getBoundingClientRect().right <= maxRight) {
            currPageTables.push(tableWrapper);
        } else {
            tabTablesPerPage.push(currPageTables);
            maxRight = tableWrapper.getBoundingClientRect().left + tabTablesMaxWidth;
            currPageTables = [tableWrapper];
        }
    });
    if (currPageTables.length) {
        tabTablesPerPage.push(currPageTables);
    }
    return tabTablesPerPage;
};

export const buildSplitTabTablesHTML = (
    classSelectors: Record<string, string>,
    tab: HTMLElement,
    tabTablesPerPage: HTMLElement[][],
): string[] => {
    const {
        tabHeaderClass,
        detailsClass,
        detailsLeftClass,
        detailsRightClass,
        addressClass,
        tabTablesClass,
        tabTitleClass,
        tabChartClass,
        tabChartsClass,
    } = classSelectors;
    const msaText = formatText(tab.querySelector(`.${detailsLeftClass}`)?.textContent || '');
    const addressText = formatText(tab.querySelector(`.${addressClass}`)?.textContent || '');
    const titleText = tab.querySelector(`.${tabTitleClass}`)?.textContent;
    const charts = Array.from(tab.querySelectorAll(`.${tabChartClass}`));
    //We need to break down the original x overflowing tab into one or more additional tabPages
    return tabTablesPerPage.map((pageTables, pageIdx) => {
        return `
            <div class='${tab.className} ${pageIdx > 0 ? `continued ${pageIdx}` : ''}'>
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
                ${pageIdx === 0 && charts && charts?.length
                ? charts
                    .map(
                        (chart: any) => `<div class='${tabChartsClass}'>
                      <img class='${tabChartClass}' src='${chart?.src}' width='560px' height='180px'/>
                    </div>`,
                    )
                    .join(' ')
                : ''
            }
                <div class='${tabTablesClass}'>
                    ${pageTables.map((table) => table.outerHTML).join('')}
                </div>
            </div>
        `;
    });
};

export const getCoverPageOptions = (loan: any): any => ({
    backgroundImageSrc: 'city.png',
    logoSrc: 'trepp-logo.png',
    textColor: '#000000',
    textOverlayColor: '#FFFFFF',
    textOverlayTransparency: 0.8,
    reportTitle: 'Details Report',
    reportDetails: [loan?.propname as string, loan?.address as string, loan?.msaname as string],
});

export const buildPDF = async (
    jsPDF: { html: (arg0: string, arg1: { autoPaging: boolean; width: number; windowWidth: any; html2canvas: { height: number; windowHeight: any; }; }) => any; addPage: () => void; },
    { pdfOptions, classSelectors }: any,
) => {
    const pdfOutput: HTMLElement = document.querySelector(`.pdf-output`);
    const { pageWidth, pageHeight, tableOfContentOpts } = pdfOptions;
    const { tabClass, tabHeaderClass, tabTitleClass, tabTablesClass } = classSelectors;
    const tabs: HTMLElement[] = Array.from(pdfOutput.querySelectorAll(`.${tabClass}`));
    for (const tab of tabs) {
        const tabHeader: HTMLElement = tab.querySelector(`.${tabHeaderClass}`) as HTMLElement;
        const tabTitle: HTMLElement = tab.querySelector(`.${tabTitleClass}`) as HTMLElement;
        const tabTables: HTMLDivElement = tab.querySelector(`.${tabTablesClass}`) as HTMLDivElement;
        handleOverflow({
            classSelectors,
            tab,
            pageHeader: tabHeader,
            pageName: tabTitle?.textContent || '',
            tabTables,
        });
    }
    const paginatedTabsHTML: string[] = getPaginatedTabsHTML(classSelectors, pdfOutput);
    pdfOutput.innerHTML = paginatedTabsHTML.map((tabHTML) => tabHTML).join('');
    const tableOfContentsPerPage: LoanDetailsPDFTableOfContents[] = getTableOfContents(
        classSelectors,
        pdfOutput,
        tableOfContentOpts,
    );
    for (const tabIdx in paginatedTabsHTML) {
        await jsPDF.html(paginatedTabsHTML[tabIdx], {
            autoPaging: false,
            width: pageWidth - 1,
            windowWidth: pageWidth,
            html2canvas: {
                height: pageHeight - 1,
                windowHeight: pageHeight,
            },
        });
        if (Number(tabIdx) < paginatedTabsHTML?.length - 1) {
            jsPDF.addPage();
        }
    }
    await addCoverPage(jsPDF, getCoverPageOptions({ propname: 'One Vander', address: '68-15 Douglaston Pkwy, Douglaston NY 11362', msaname: 'NY-NJ-ETC' }), pdfOptions);
    addTableOfContentsToPDF(tableOfContentsPerPage, jsPDF, tableOfContentOpts);
    pdf.save();
    // addDisclaimerPage(jsPDF);
    // if (mountedViewRef?.current && toolStatus === ToolStatus.LOADING) {
    //   setToolStatus(ToolStatus.READY);
    // }
};

buildPDF(pdf, { pdfOptions, classSelectors })
