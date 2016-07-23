import { Component, Inject, Input, Output } from 'ng-metadata/core';
import { Notification } from './../../../../lib/gj-lib-client/components/notification/notification-model';
import { Fireside_Post } from './../../../../lib/gj-lib-client/components/fireside/post/post-model';
import { ActivityFeedItem } from './item-service';
import { ActivityFeedContainer } from './feed-container-service';
import template from 'html!./feed.html';

/**
 * The number of items from the bottom that we should hit before loading more.
 */
const LOAD_MORE_FROM_BOTTOM = 2;

/**
 * The number of times we should do an auto-load of items before stopping
 * and requiring them to do it manually.
 */
const LOAD_MORE_TIMES = 3;

@Component({
	selector: 'gj-activity-feed',
	template,
})
export class FeedComponent
{
	@Input( '@' ) type: 'Notification' | 'Fireside_Post';
	@Input( '<items' ) feed: ActivityFeedContainer;
	@Input( '@' ) loadMoreUrl: string;
	@Input( '<?' ) showEditControls = false;
	@Input( '<?' ) showGameInfo = false;

	@Output( '?onPostRemoved' ) private _onPostRemoved?: Function;
	@Output( '?onPostEdited' ) private _onPostEdited?: Function;
	@Output( '?onPostPublished' ) private _onPostPublished?: Function;

	private _inView: { [k: string]: ActivityFeedItem } = {};

	private _timesLoaded = 0;
	private _isLoadingMore = false;

	/**
	 * Whether or not this feed was bootstrapped with previous data.
	 * This happens when you click the back button into a feed.
	 */
	wasHistorical: boolean;

	constructor(
		@Inject( '$scope' ) $scope: ng.IScope,
		@Inject( '$document' ) private $document: ng.IDocumentService,
		@Inject( '$timeout' ) private $timeout: ng.ITimeoutService,
		@Inject( 'Scroll' ) private scroll: any,
		@Inject( 'Api' ) private api: any,
		@Inject( 'Notification' ) private notificationModel: typeof Notification,
		@Inject( 'Fireside_Post' ) private firesidePostModel: typeof Fireside_Post,
	)
	{
		this.wasHistorical = !!this.feed.getActive();

		// Keep our post list in sync with parent.
		$scope.$watchCollection( () => this.feed.items || [], ( newVal, oldVal ) =>
		{
			this._isLoadingMore = false;

			// First time getting items in.
			// Let's try scrolling to a possible active one.
			// This will happen if they click away and back to the feed.
			if ( newVal.length && newVal === oldVal ) {
				this._scrollActive();
			}
		} );
	}

	private _scrollActive()
	{
		const active = this.feed.getActive();
		if ( active ) {
			this.$timeout( () =>
			{
				const id = `activity-feed-item-${active.id}`;
				const elem = this.$document[0].getElementById( id );
				if ( elem ) {
					this.scroll.to( id, { animate: false } );
					elem.classList.add( 'active' );
				}
			}, 200, false );
		}
	}

	isItemUnread( item: ActivityFeedItem )
	{
		// Only makes sense for notification feeds.
		if ( this.type != 'Notification' || typeof this.feed.notificationWatermark === 'undefined' || !(item.sourceItem instanceof Notification) ) {
			return false;
		}

		return item.feedItem.added_on > this.feed.notificationWatermark;
	}

	isItemInView( item: ActivityFeedItem )
	{
		return !!this._inView[ item.id ];
	}

	setActive( item: ActivityFeedItem )
	{
		this.feed.setActive( item );
	}

	onPostEdited( post: Fireside_Post )
	{
		this.feed.update( post );
		if ( this._onPostEdited ) {
			this._onPostEdited( { $post: post } );
		}
	}

	onPostPublished( post: Fireside_Post )
	{
		if ( this._onPostPublished ) {
			this._onPostPublished( { $post: post } );
		}
	}

	onPostRemoved( post: Fireside_Post )
	{
		this.feed.remove( post );
		if ( this._onPostRemoved ) {
			this._onPostRemoved( { $post: post } );
		}
	}

	loadMore()
	{
		if ( this._isLoadingMore || this.feed.reachedEnd ) {
			return;
		}

		this._isLoadingMore = true;
		++this._timesLoaded;

		const lastPost = this.feed.items[ this.feed.items.length - 1 ];

		this.api.sendRequest( this.loadMoreUrl, { scrollId: lastPost.scrollId } )
			.then( ( response: any ) =>
			{
				if ( !response.items || !response.items.length ) {
					this.feed.reachedEnd = true;
					return;
				}

				if ( this.type == 'Notification' ) {
					this.feed.append( this.notificationModel.populate( response.items ) );
				}
				else if ( this.type == 'Fireside_Post' ) {
					this.feed.append( this.firesidePostModel.populate( response.items ) );
				}
			} );
	}

	onItemInViewChange( visible: boolean, item: ActivityFeedItem )
	{
		if ( visible ) {
			this._inView[ item.id ] = item;

			this.feed.setActive( item );
			this.feed.viewed( item );

			// Auto-loading while scrolling.
			if ( !this._isLoadingMore && !this.feed.reachedEnd && this._timesLoaded < LOAD_MORE_TIMES ) {
				const index = _.findIndex( this.feed.items, { id: item.id } );
				if ( index >= this.feed.items.length - LOAD_MORE_FROM_BOTTOM ) {
					this.loadMore();
				}
			}
		}
		else {
			delete this._inView[ item.id ];
		}

		if ( !_.size( this._inView ) ) {
			this.feed.setActive( undefined );
		}
	}

	onItemExpanded( item: ActivityFeedItem )
	{
		this.feed.expanded( item );
	}
}
