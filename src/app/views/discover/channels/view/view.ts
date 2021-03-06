import { Route } from 'vue-router';
import { State } from 'vuex-class';
import { Component } from 'vue-property-decorator';
import View from '!view!./view.html';

import { ChannelsViewHelper } from '../channels-view-helper';
import { Api } from '../../../../../lib/gj-lib-client/components/api/api.service';
import { Meta } from '../../../../../lib/gj-lib-client/components/meta/meta-service';
import { Channels } from '../../../../components/channel/channels-service';
import { AppPageHeader } from '../../../../components/page-header/page-header';
import { number } from '../../../../../lib/gj-lib-client/vue/filters/number';
import {
	BaseRouteComponent,
	RouteResolve,
} from '../../../../../lib/gj-lib-client/components/route/route-component';
import { Store } from '../../../../store/index';

@View
@Component({
	name: 'RouteDiscoverChannelsView',
	components: {
		AppPageHeader,
	},
})
export default class RouteDiscoverChannelsView extends BaseRouteComponent {
	@State route!: Store['route'];

	channel = '';

	number = number;
	Meta = Meta;
	Channels = Channels;

	get img() {
		const info = Channels.channels.find(i => i.id === this.channel);
		return info && info.image;
	}

	@RouteResolve({ cache: true, lazy: true, cacheTag: 'view' })
	routeResolve(this: undefined, route: Route) {
		return Api.sendRequest('/web/discover/channels/' + route.params.channel);
	}

	get routeTitle() {
		return ChannelsViewHelper.getRouteTitle(this.route.params.channel);
	}

	routeInit() {
		this.channel = this.route.params.channel;
		ChannelsViewHelper.setDefaultMetaData(this.route.params.channel);
	}

	routed($payload: any) {
		// Overwrite channel from server so we can decide how it displays in the
		// end.
		this.channel = $payload.channel;
	}
}
