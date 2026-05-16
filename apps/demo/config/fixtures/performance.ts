import { UserData } from "../types";

export const performancePath = "/performance";

const PAGE_COUNT = 100;
const SECTIONS_PER_PAGE = 2;
const ROWS_PER_SECTION = 2;
const CELLS_PER_ROW = 2;

const createText = (
  pageNumber: number,
  sectionNumber: number,
  rowNumber: number,
  cellNumber: number
) =>
  ({
    type: "Text",
    props: {
      id: `PerformanceText-${pageNumber}-${sectionNumber}-${rowNumber}-${cellNumber}`,
      align: "left",
      color: cellNumber % 2 === 0 ? "muted" : "default",
      layout: {
        grow: true,
        padding: "0px",
      },
      size: "s",
      text: `Page ${pageNumber}, section ${sectionNumber}, row ${rowNumber}, cell ${cellNumber}`,
    },
  } satisfies UserData["content"][number]);

const createRow = (
  pageNumber: number,
  sectionNumber: number,
  rowNumber: number
) =>
  ({
    type: "Flex",
    props: {
      direction: "row",
      gap: 16,
      id: `PerformanceRow-${pageNumber}-${sectionNumber}-${rowNumber}`,
      items: Array.from({ length: CELLS_PER_ROW }, (_, cellIndex) =>
        createText(pageNumber, sectionNumber, rowNumber, cellIndex + 1)
      ),
      justifyContent: "start",
      layout: {
        grow: false,
        padding: "0px",
      },
      wrap: "nowrap",
    },
  } satisfies UserData["content"][number]);

const createSection = (pageNumber: number, sectionNumber: number) =>
  ({
    type: "Flex",
    props: {
      direction: "column",
      gap: 16,
      id: `PerformanceSection-${pageNumber}-${sectionNumber}`,
      items: [
        {
          type: "Heading",
          props: {
            align: "left",
            id: `PerformanceSectionHeading-${pageNumber}-${sectionNumber}`,
            layout: {
              padding: "0px",
            },
            level: "3",
            size: "m",
            text: `Section ${sectionNumber}`,
          },
        },
        ...Array.from({ length: ROWS_PER_SECTION }, (_, rowIndex) =>
          createRow(pageNumber, sectionNumber, rowIndex + 1)
        ),
      ],
      justifyContent: "start",
      layout: {
        grow: false,
        padding: "0px",
      },
      wrap: "nowrap",
    },
  } satisfies UserData["content"][number]);

const createPage = (pageNumber: number) =>
  ({
    type: "Flex",
    props: {
      direction: "column",
      gap: 24,
      id: `PerformancePage-${pageNumber}`,
      items: [
        {
          type: "Heading",
          props: {
            align: "left",
            id: `PerformancePageHeading-${pageNumber}`,
            layout: {
              padding: "0px",
            },
            level: "2",
            size: "l",
            text: `Performance Page ${pageNumber}`,
          },
        },
        {
          type: "Text",
          props: {
            align: "left",
            color: "muted",
            id: `PerformancePageText-${pageNumber}`,
            layout: {
              padding: "0px",
            },
            size: "s",
            text: "Nested existing demo components used to stress outline and selection updates.",
          },
        },
        ...Array.from({ length: SECTIONS_PER_PAGE }, (_, sectionIndex) =>
          createSection(pageNumber, sectionIndex + 1)
        ),
      ],
      justifyContent: "start",
      layout: {
        grow: false,
        padding: "96px",
      },
      wrap: "nowrap",
    },
  } satisfies UserData["content"][number]);

export const performanceData: UserData = {
  root: {
    props: {
      title: "Performance Fixture",
    },
  },
  content: Array.from({ length: PAGE_COUNT }, (_, pageIndex) =>
    createPage(pageIndex + 1)
  ),
  zones: {},
};
