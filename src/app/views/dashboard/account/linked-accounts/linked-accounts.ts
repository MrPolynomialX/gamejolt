import { Component } from 'vue-property-decorator';
import View from '!view!./linked-accounts.html';

import {
	BaseRouteComponent,
	RouteResolve,
} from '../../../../../lib/gj-lib-client/components/route/route-component';
import { AppState, AppStore } from '../../../../../lib/gj-lib-client/vue/services/app/app-store';
import { RouteMutation, RouteStore } from '../account.store';
import { Api } from '../../../../../lib/gj-lib-client/components/api/api.service';
import { YoutubeChannel } from '../../../../../lib/gj-lib-client/components/youtube/channel/channel-model';
import { AppLinkedAccount } from '../../../../../lib/gj-lib-client/components/linked-account/linked-account';
import {
	LinkedAccount,
	Provider,
} from '../../../../../lib/gj-lib-client/components/linked-account/linked-account.model';
import { LinkedAccounts } from '../../../../../lib/gj-lib-client/components/linked-account/linked-accounts.service';
import { Growls } from '../../../../../lib/gj-lib-client/components/growls/growls.service';
import { Translate } from '../../../../../lib/gj-lib-client/components/translate/translate.service';
import { UserSetPasswordModal } from '../../../../components/user/set-password-modal/set-password-modal.service';

@View
@Component({
	name: 'RouteDashAccountLinkedAccounts',
	components: {
		AppLinkedAccount,
	},
})
export default class RouteDashAccountLinkedAccounts extends BaseRouteComponent {
	@AppState user: AppStore['user'];
	@RouteMutation setHeading: RouteStore['setHeading'];

	accounts: LinkedAccount[] = [];
	channels: YoutubeChannel[] = [];

	get facebookAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_FACEBOOK);
	}

	get twitterAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_TWITTER);
	}

	get googleAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_GOOGLE);
	}

	get twitchAccount() {
		return this.getAccount(LinkedAccount.PROVIDER_TWITCH);
	}

	getAccount(provider: string) {
		if (this.accounts) {
			for (const account of this.accounts) {
				if (account.provider === provider) {
					return account;
				}
			}
		}
		return null;
	}

	@RouteResolve()
	routeResolve(this: undefined) {
		return Api.sendRequest('/web/dash/linked-accounts');
	}

	get routeTitle() {
		return this.$gettext('Linked Accounts');
	}

	routed($payload: any) {
		this.setHeading(this.$gettext('Linked Accounts'));
		this.channels = YoutubeChannel.populate($payload.channels);
		this.accounts = LinkedAccount.populate($payload.accounts);
	}

	async onLink(_e: Event, provider: Provider) {
		await LinkedAccounts.link(this.$router, provider, '/web/dash/linked-accounts/link/');
	}

	async onUnlink(e: Event, provider: Provider) {
		if (!this.user) {
			return;
		}

		try {
			const response = await Api.sendRequest(
				'/web/dash/linked-accounts/unlink/' + provider,
				{}
			);
			this.accounts = LinkedAccount.populate(response.accounts);
			const providerName = LinkedAccount.getProviderDisplayName(provider);
			Growls.success(
				Translate.$gettextInterpolate(
					`Your %{ provider } account has been unlinked from the site.`,
					{ provider: providerName }
				),
				Translate.$gettext('Account Unlinked')
			);
		} catch (error) {
			// If they don't have a password, we have to show them a modal to set it.
			if (error === 'no-password') {
				const result = await UserSetPasswordModal.show();
				if (!result) {
					return;
				}

				Growls.success(
					this.$gettext('Your new password has been set. You can now log in with it.'),
					this.$gettext('Password Set')
				);

				// Try to unlink again once they've set one!
				await this.onUnlink(e, provider);
			}
			// TODO: proper fail case?
		}
	}
}
