import Homey from 'homey';

class App extends Homey.App {
  private readonly filteredHeaders = ["Authorization"];
  private readonly filteredQueries = ["homey", "event"];

  async onInit() {
    const id = Homey.env.WEBHOOK_ID;
    const secret = Homey.env.WEBHOOK_SECRET;

    const flowAny = this.homey.flow.getTriggerCard('advanced-webhook-triggered-any');
    const flowEvent = this.homey.flow.getTriggerCard('advanced-webhook-triggered-event');
    const flowAnyJsonArray = this.homey.flow.getTriggerCard('advanced-webhook-triggered-any-json-array');
    const flowAnyJsonObject = this.homey.flow.getTriggerCard('advanced-webhook-triggered-any-json-object');
    const flowEventJsonArray = this.homey.flow.getTriggerCard('advanced-webhook-triggered-event-json-array');
    const flowEventJsonObject = this.homey.flow.getTriggerCard('advanced-webhook-triggered-event-json-object');
    
    flowEvent.registerRunListener(async (args, state) => {
      return args.event === state.event;
    });

    flowEventJsonArray.registerRunListener(async (args, state) => {
      return args.event === state.event;
    });

    flowEventJsonObject.registerRunListener(async (args, state) => {
      return args.event === state.event;
    });

    const webhook = await this.homey.cloud.createWebhook(id, secret, {});

    // Set this so its available from the settings page.
    const baseUrl = "https://webhooks.athom.com/webhook/";
    const homeyId = await this.homey.cloud.getHomeyId();
    const homeyUrl = baseUrl + id + "?homey=" + homeyId;
    this.homey.settings.set("webhook_url", homeyUrl);

    webhook.on('message', args => {
      const headers = Object.keys(args.headers)
        .filter(name =>  !this.filteredHeaders.includes(name))
        .reduce((obj: any, key: string) => {
          obj[key] = args.headers[key];
          return obj;
        }, {});

      const query = Object.keys(args.query)
      .filter(name =>  !this.filteredQueries.includes(name))
        .reduce((obj: any, key: string) => {
          obj[key] = args.query[key];
          return obj;
        }, {});

      const tokens = {
        event: args.query.event,
        headers: JSON.stringify(headers),
        query: JSON.stringify(query),
        body: JSON.stringify(args.body)
      };

      flowAny.trigger(tokens)
        .catch(this.error);
      
      flowEvent.trigger(tokens, { event: args.query.event })
        .catch(this.error);

      if(Array.isArray(args.body))
      {
        args.body.forEach((element: any) => {
          flowAnyJsonArray.trigger({ ...tokens, item: element });
          flowEventJsonArray.trigger({ ...tokens, item: element }, { event: args.query.event });
        });
      }

      if(typeof args.body === 'object' &&
        !Array.isArray(args.body) &&
        args.body !== null)
      {
        Object.keys(args.body).forEach(property => {
          const value = JSON.stringify(args.body[property]);

          flowAnyJsonObject.trigger({ ...tokens, property, value });
          flowEventJsonObject.trigger({ ...tokens, property, value }, { event: args.query.event });
        });
      }
    });
  }

}

module.exports = App;
