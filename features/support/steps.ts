import { Given, When, Then } from "cucumber"
import { openPage } from "./browser-actions"
import { config } from "./config"
import { importAdminPK, switchNetwork } from "./ethereum-actions";
import { CentrifugeWorld } from "./world";
import { selectors } from "./selectors";
import { getTextContent } from './utils/getTextContent'
import { waitUntil } from "./utils/waitUntil";

Given("I am on the Gateway Page", async function (this: CentrifugeWorld) {
  await openPage(this, config.gatewayUrl);
});

Given('I am logged into MetaMask as Tinlake admin', async function (this: CentrifugeWorld) {
  await importAdminPK(this)
  await switchNetwork(this)
});

Given("I am on the Tinlake investments page", async function (this: CentrifugeWorld) {
  await openPage(this, `${config.tinlakeUrl}/${config.tinlakePoolRoot}/investments`);
});

Given("I am connected to Tinlake", async function (this: CentrifugeWorld) {
  const connect = await this.currentPage.waitForXPath(selectors.tinlake.connectButton)
  await connect.click()
  const metamask = await this.currentPage.waitForXPath(selectors.tinlake.web3modalMetamaskButton)
  await metamask.click()
  await this.metamask.approve()
});

Given('the min TIN ratio is set to {int}%', function (int) {
  // TODO add logic to set the TIN ratio directly in tinlake.js
});

When('I set Min TIN ratio to {int}%', async function (this: CentrifugeWorld, int: number) {
  const input = await this.currentPage.waitForXPath(selectors.tinlake.minTINRatioInput)
  await input.click({ clickCount: 3 }) // triple click to select all content
  await input.type(`${int}`)

  const button = await this.currentPage.waitForXPath(selectors.tinlake.setMinTINRatioButton)
  await button.click()

  await this.metamask.confirmTransaction({ gas: 50, gasLimit: 50000 })
});

Then('I see that Min TIN ratio component is set to {int}%', async function (this: CentrifugeWorld, int: number) {
  const expected = `${int}.00 %`
  let actual = ''
  await waitUntil(async () => {
    const display = await this.currentPage.waitForXPath(selectors.tinlake.minTINRatioDisplay)
    actual = await getTextContent(display)

    return actual === expected
  }, { errorMsg: `expected min tin ratio display to show ${int} %, but got ${actual}`})
});
