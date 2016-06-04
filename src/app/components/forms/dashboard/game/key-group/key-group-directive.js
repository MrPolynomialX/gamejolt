angular.module( 'App.Forms.Dashboard' ).directive( 'gjFormDashboardGameKeyGroup', function( Form, KeyGroup )
{
	var form = new Form( {
		model: 'KeyGroup',
		template: '/app/components/forms/dashboard/game/key-group/key-group.html',
		resetOnSubmit: true,
	} );

	form.scope.game = '=';
	form.scope.packages = '=';

	form.onInit = function( scope )
	{
		scope.KeyGroup = KeyGroup;
		scope.formModel.game_id = scope.game.id;

		scope.formModel.packages = {};
		if ( scope.method == 'add' ) {
		}
		if ( scope.method == 'edit' ) {
			angular.forEach( scope.baseModel.packages, function( package )
			{
				scope.formModel.packages[ package.id ] = true;
			} );
		}

		scope.arePackagesChosen = function()
		{
			for ( var i in scope.formModel.packages ) {
				if ( scope.formModel.packages[ i ] ) {
					return true;
				}
			}
			return false;
		};
	};

	return form;
} );