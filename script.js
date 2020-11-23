function sleep(ms) {
  return new Promise(function(resolve, reject) {
    setTimeout(resolve, ms);
  });
}


// TODO: Make this more logical and flexible.
function getItemImageUrl(item) {
  const tile = item.image.tile;
  const t178 = tile['1.78'];
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
  var template = document.createElement('template');
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
    this._rendered = false;
    this.initializeData();
    this.initializeListeners();
  }

  initializeListeners() {
    this._keydownListener = ({ key }) => {
      switch(key) {
        case 'ArrowUp':
          this.upHandler();
          break;
        case 'ArrowDown':
          this.downHandler();
          break;
        case 'ArrowLeft':
          this.leftHandler();
          break;
        case 'ArrowRight':
          this.rightHandler();
          break;
      }
    };
    document.addEventListener('keydown', this._keydownListener);
  }

  upHandler() {
  }
  downHandler() {
  }
  leftHandler() {
  }
  rightHandler() {
    console.log('right');
    this.state.ui.collectionState = collectionState;
    this.state.ui.currentCollection = 0;
    this.state.ui.currentSelectionIndex = 2;
    const { 
      collectionState,
      currentCollection,
      currentSelectionIndex
    } = this.state.ui;
  }

  async initializeData() {
    await this.populateHomePageData(this.homePageUrl);
    await this.populateRefSets();
    this.setUIState();
    this.render();
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
    console.log(this.state.ui.currentSelectedCollectionId);
  }

  /**
    Caching from the start here.
  */
  async fetchRefSet(id) {
    if (this.state.refSets[id]) {
      return this.state.refSets[id];
    } else {
      const refSetData = await fetch(`https://cd-static.bamgrid.com/dp-117731241344/sets/${id}.json`)
        .then(response => response.json())
      //await sleep(100);
      this.state.refSets[id] = refSetData;
      return refSetData;
    }
  }

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

  setUIState() {
    const collectionState = this.state.homePageData.data.StandardCollection.containers.map(c => {
      return {
        currentFirstVisibleItem: 0,
      }
    });
    this.state.ui.collectionState = collectionState;
    this.state.ui.currentCollection = 0;
    this.state.ui.currentSelectionIndex = 0;
    console.log(this.state.homePageData);
  }

  render() {
    const collections = this.state.homePageData.data.StandardCollection.containers;
    collections.forEach((c, i) => {
        // Note: Retrieving this state blindly via index would get
        // trickier with more dynamic data. You'd want better getters,
        // probably referencing this state by collection id rather than
        // index.
        const collectionUIState = this.state.ui.collectionState[i];
        if (i === this.state.ui.currentCollection) {
          collectionUIState.collectionIsActive = true;
          collectionUIState.currentSelectionIndex = this.state.ui.currentSelectionIndex;
        }
        this.container.appendChild(this.renderCollection(c, collectionUIState));
      });
    console.log('render complete');
    this._rendered = true;
  }

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

  /**
    Note: Requires a collection's data to be fully populated.
  */
  renderCollection(collectionData, { currentFirstVisibleItem, collectionIsActive, currentSelectionIndex }) {
    const collectionTemplateString = `
      <div class="collection">
        <h2>%title</h2>
        <div class="items-container">
        </div>
      </div>
    `;
    const title = collectionData.set.text.title.full.set.default.content;
    const collectionElement = htmlToElement(collectionTemplateString.replace('%title', title));
    const itemsContainer = collectionElement.querySelector('.items-container');

    // Only render populated sets for the moment.
    const items = this.getCollectionItems(collectionData);
    items.forEach((item, i) => {
      const itemIsSelected = collectionIsActive && currentSelectionIndex === i;
      itemsContainer.appendChild(this.renderItem(item, { itemIsSelected }));
    });
    // N.B. only appending to DOM after successful render above means nothing gets rendered unless everything succeeds.
    return collectionElement;
  }

  renderItem(itemData, { itemIsSelected }) {
    console.log(itemIsSelected);
    const itemTemplateString = `
      <div class="item-container">
      <img src="%image-url" />
      </div>
      `;
    const itemElement = htmlToElement(itemTemplateString.replace('%image-url', getItemImageUrl(itemData)));
    if (itemIsSelected) {
      console.log(itemElement);
      itemElement.classList.add('selected');
    }
    return itemElement;
  }

  // Because there's no framework here and the UI is limited in scope,
  // I'm opting to update the UI instead of re-render it
  // whenever the state changes. This requires more thought about
  // *which* state changes are happening. On the plus side it
  // provide more flexibility in dealing with transitions.
  update() {
    if (!this._rendered) {
      return this.render();
    }
  }



  changeActiveSelection() {
  }
}

new HomePage({
  homePageUrl: 'https://cd-static.bamgrid.com/dp-117731241344/home.json',
  container: document.querySelector('#app'),
});

/**
Notes on navigation:
- left goes left
- right goes right
- horizontal scrolling:
  - lazily scroll to items
- vertical scrolling:
  - eagerly scroll to items (keep thigns centered when possible)




*/
