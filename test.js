const { HomePage } = require('./script');


function getMockUIState() {
  const mockUIState = {
    "currentSelectedCollectionId": "d0c43e18-1348-4b1c-9b3f-58eaa22fa5a7",
    "collectionState": [
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    },
    {
      "currentFirstVisibleItem": 0
    }
    ],
    "currentCollectionIndex": 0,
    "currentSelectionIndex": 0
  };
  return mockUIState;
}

class _HomePage extends HomePage {
  constructor() {
    super({});
    this.state = {
      ui: getMockUIState()
    };
  }
  initializeData() {
    return new Promise(() => {});
    // no op
  }
  initializeListeners() {
    // no op
  }
}

describe('getCurrentVisibleItemNumber', () => {
  let homePage;
  beforeEach(() => {
    homePage = new _HomePage();
  });
  it('exists', () => {
    expect(homePage.getCurrentVisibleItemNumber).toBeDefined();
  });
  it('Returns current selection index minus current first visible item', () => {
    homePage.state.ui.collectionState[1].currentFirstVisibleItem = 4;
    homePage.state.ui.currentSelectionIndex = 5;
    homePage.state.ui.currentCollectionIndex = 1;
    expect(homePage.getCurrentVisibleItemNumber()).toEqual(1);
  });
  // TODO: More cases
});

describe('shiftCollectionRetainingSelectedIndex', () => {
  let homePage;
  beforeEach(() => {
    homePage = new _HomePage();
  });
  it('exists', () => {
    expect(homePage.shiftCollectionRetainingSelectedIndex).toBeDefined();
  });
  it('Adjusts current selection index to correct visual column', () => {
    homePage.state.ui.collectionState[0].currentFirstVisibleItem = 4;
    homePage.state.ui.collectionState[1].currentFirstVisibleItem = 1;
    homePage.state.ui.currentSelectionIndex = 5;
    homePage.shiftCollectionRetainingSelectedIndex(1);
    expect(homePage.state.ui.currentSelectionIndex).toEqual(2);
  });
});
