function sleep(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms);
  });
}


// TODO: Make this more logical and flexible.
function getItemImageUrl(item) {
  const tile = item.image.tile;
  const t178 = tile["1.78"];
  let def;
  if (t178.default) {
    def = t178.default;
  } else if (t178.program) {
    def = t178.program;
  } else if (t178.series) {
    def = t178.series;
  }
  return def.default.url;
}

// From: https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
/**
 * @param {String} HTML representing a single element
 * @return {Element}
 */
function htmlToElement(html) {
  var template = document.createElement("template");
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}


class HomePage {
  constructor({ homePageUrl, container }) {
    this.container = container;
    this.homePageUrl = homePageUrl;
    this.state = {
      ui: {}
    };
    // Use as promise here because there are no async constructors
    // but leave logic in constructor.
    // Using an event for "ready" would be a nice alternative.
    this.initializeData().then(() => {
      this.setUIState();
      this.render();
    });
    this.initializeListeners();
  }

  async initializeData() {
    await this.populateHomePageData(this.homePageUrl);
    await this.populateRefSets();
  }

  async populateHomePageData(homePageUrl) {
    // Note: consider finding a way to delay this to test out regular network conditions
    const homePageData = await fetch(homePageUrl).then(response => response.json())

    // The tile image for the 2nd item in the first collection is 404'ing...
    // Just removed it as an expedient.
    homePageData.data.StandardCollection.containers[0].set.items.splice(1, 1);

    this.state.homePageData = homePageData;

    const initialCollectionSet = homePageData.data.StandardCollection.containers[0].set;
    this.state.ui.currentSelectedCollectionId = initialCollectionSet.setId || initialCollectionSet.refId;
  }


  /*
    Store ref sets in the state separate from
    the homepage data to provide more flexibility
    for data retrieval down the line.
  */
  async populateRefSets() {
    const homePageData = this.state.homePageData;
    const refSetIds = homePageData.data.StandardCollection.containers
      .filter(c => c.set.type === "SetRef")
      .map(c => c.set.refId);
    this.state.refSets = {};
    const refFetchPromises = refSetIds.map(async id => {
      return await this.fetchRefSet(id);
    });
    return Promise.all(refFetchPromises)
  }

  /*
    Caching from the start here.
  */
  async fetchRefSet(id) {
    if (this.state.refSets[id]) {
      return this.state.refSets[id];
    } else {
      const refSetData = await fetch(`https://cd-static.bamgrid.com/dp-117731241344/sets/${id}.json`)
        .then(response => response.json())
      this.state.refSets[id] = refSetData;
      return refSetData;
    }
  }

  setUIState() {
    const collectionState = this.state.homePageData.data.StandardCollection.containers.map(c => {
      return {
        currentFirstVisibleItem: 0,
      }
    });
    this.state.ui.collectionState = collectionState;
    this.state.ui.currentCollectionIndex = 0;
    this.state.ui.currentSelectionIndex = 0;
  }

  /*
    Retrieve collection items when passed overall data object from homepage.
    Should perhaps be via ID instead.
  */
  getCollectionItems(collectionData) {
    if (collectionData.set.type === "SetRef") {
      const refSetData = this.state.refSets[collectionData.set.refId];
      // TODO - is this in the data in a better place? Take a look
      const setType = Object.keys(refSetData.data);
      return refSetData.data[setType].items;
    } else {
      return collectionData.set.items;
    }
  }

  /*
    Retrieve collection items by index in overall list of collections.
  */
  getCollectionItemsAtIndex(index) {
    const collectionData = this.state.homePageData.data.StandardCollection.containers[index];
    return this.getCollectionItems(collectionData);
  }

  initializeListeners() {
    this._keydownListener = (e) => {
      const { key } = e;
      switch(key) {
        case "ArrowUp":
          e.preventDefault();
          this.upHandler();
          break;
        case "ArrowDown":
          e.preventDefault();
          this.downHandler();
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.leftHandler();
          break;
        case "ArrowRight":
          e.preventDefault();
          this.rightHandler();
          break;
      }
    };
    document.addEventListener("keydown", this._keydownListener);
  }

  upHandler() {
    const uiState = this.state.ui;

    if (uiState.currentCollectionIndex === 0) {
      // At top
      return;
    }

    // Change state
    this.shiftCollectionRetainingSelectedIndex(-1);


    // Modify UI
    this.updateUIFromNavigationChange();
  }

  downHandler() {
    const uiState = this.state.ui;

    if (uiState.collectionState.length <= uiState.currentCollectionIndex + 1) {
      // At last collection
      return;
    }

    // Change state
    this.shiftCollectionRetainingSelectedIndex(1);

    // Modify UI
    this.updateUIFromNavigationChange();
  }

  leftHandler() {
    const uiState = this.state.ui;

    if (uiState.currentSelectionIndex === 0) {
      return;
    }

    // Change state
    uiState.currentSelectionIndex--;


    // Modify UI
    this.updateUIFromNavigationChange();
  }

  rightHandler() {
    const uiState = this.state.ui;
    const currentCollectionData = this.getCollectionItemsAtIndex(uiState.currentCollectionIndex);

    if (currentCollectionData.length <= uiState.currentSelectionIndex + 1) {
      // End of list
      return;
    }

    // Change state
    uiState.currentSelectionIndex++;

    // Modify UI
    this.updateUIFromNavigationChange();
  }

  /**
    Change which collection is updated
    while retaining the same visual
    column selection.
  */
  shiftCollectionRetainingSelectedIndex(change) {
    const uiState = this.state.ui;
    const currentVisibleItemNumber = this.getCurrentVisibleItemNumber();

    // Modify state
    uiState.currentCollectionIndex += change;

    // Use known visual state and stored visible item to determine new selection index
    uiState.currentSelectionIndex = uiState.collectionState[uiState.currentCollectionIndex].currentFirstVisibleItem + currentVisibleItemNumber;
  }

  getCurrentVisibleItemNumber() {
    const uiState = this.state.ui;
    return uiState.currentSelectionIndex - uiState.collectionState[uiState.currentCollectionIndex].currentFirstVisibleItem;
  }

  updateUIFromNavigationChange() {
    this.updateSelectedTile();
    this.setHorizontalScroll();
    this.setVerticalScroll();
  }

  setHorizontalScroll() {
    const uiState = this.state.ui;
    const { currentFirstVisibleItem } = uiState.collectionState[uiState.currentCollectionIndex];
    const currentCollectionEl = this.container.querySelectorAll(".collection")[uiState.currentCollectionIndex]
    // TODO: unify these logic blocks
    // left
    if (uiState.currentSelectionIndex < currentFirstVisibleItem) {
      currentCollectionEl.querySelector(".items-container").scroll({
        left: 384 * (uiState.currentSelectionIndex),
        behavior: "smooth"
      });
      uiState.collectionState[uiState.currentCollectionIndex].currentFirstVisibleItem = uiState.currentSelectionIndex;
    }
    // right
    if (uiState.currentSelectionIndex - currentFirstVisibleItem >= 5) {
      currentCollectionEl.querySelector(".items-container").scroll({
        left: 384 * (uiState.currentSelectionIndex - 4),
        behavior: "smooth"
      });
      uiState.collectionState[uiState.currentCollectionIndex].currentFirstVisibleItem = uiState.currentSelectionIndex - 4;
    }
  }

  setVerticalScroll() {
    const uiState = this.state.ui;
    const currentCollectionEl = this.container.querySelectorAll(".collection")[uiState.currentCollectionIndex]
    const appHeight = this.container.offsetHeight;
    const elHeight = currentCollectionEl.offsetHeight;
    const offsetTop = currentCollectionEl.offsetTop;
    this.container.scroll({
      top: offsetTop - ((appHeight - elHeight) / 2),
      behavior: "smooth"
    });
  }

  /*
    Visually update which item is selected.
  */
  updateSelectedTile() {
    const uiState = this.state.ui;
    this.container.querySelectorAll(".selected").forEach(e => e.classList.remove("selected"))
    const currentCollectionEl = this.container.querySelectorAll(".collection")[uiState.currentCollectionIndex]
    currentCollectionEl.querySelectorAll(".item-container")[uiState.currentSelectionIndex].classList.add("selected");
  }

  // Because there's no framework here and the UI is limited in scope,
  // I'm opting to update the UI instead of re-render it
  // whenever the state changes. This requires more thought about
  // *which* state changes are happening. On the plus side it
  // provide more flexibility in dealing with transitions.
  render() {
    const collections = this.state.homePageData.data.StandardCollection.containers;
    collections.forEach((c, i) => {
        // Note: Retrieving this state blindly via index would get
        // trickier with more dynamic data. You'd want better getters,
        // probably referencing this state by collection id rather than
        // index.
        const collectionUIState = this.state.ui.collectionState[i];
        this.container.appendChild(this.renderCollection(c, collectionUIState));
      });
    this.updateSelectedTile();
  }


  /**
    Note: Requires a collection's data to be fully populated.
  */
  renderCollection(collectionData) {
    const collectionTemplateString = `
      <div class="collection">
        <h2>%title</h2>
        <div class="items-container">
        </div>
      </div>
    `;
    const title = collectionData.set.text.title.full.set.default.content;
    const collectionElement = htmlToElement(collectionTemplateString.replace("%title", title));
    const itemsContainer = collectionElement.querySelector(".items-container");

    // Only render populated sets for the moment.
    const items = this.getCollectionItems(collectionData);
    items.forEach(item => {
      itemsContainer.appendChild(this.renderItem(item));
    });
    // N.B. only appending to DOM after successful render above means nothing gets rendered unless everything succeeds.
    return collectionElement;
  }

  renderItem(itemData) {
    const itemTemplateString = `
      <div class="item-container">
      <img src="%image-url" />
      </div>
      `;
    return htmlToElement(itemTemplateString.replace("%image-url", getItemImageUrl(itemData)));
  }
}


if (typeof jest !== 'undefined') {
  module.exports = {
    HomePage
  };
} else {
  new HomePage({
    homePageUrl: "https://cd-static.bamgrid.com/dp-117731241344/home.json",
    container: document.querySelector("#app"),
  });
}


/**
todos:
x sort out refsets in scrolling
- identify why items shift when selection leaves *collection* but not just when it moves
*/
