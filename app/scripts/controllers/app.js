'use strict';

/**
 * @ngdoc function
 * @name grademanagerApp.controller:AppCtrl
 * @description
 * # AppCtrl
 * Controller of the grademanagerApp
 */
angular.module('grademanagerApp')
  .controller('AppCtrl', function ($scope, $state, $stateParams, auth) {
    var _this = this;
    this.tabIndex = 0;
    this.tabInit = false;
    this.hideTabs = true;

    this.project = function(){
      return $stateParams.project;
    };

    this.getUsername = function(){
      return auth.getUsername();
    };

    this.isAuthed = function() {
      return auth.isAuthed();
    };

    this.logout = function(){
      auth.logout();
      _this.go('home');
    };

    this.go = function(state){
      if(_this.tabInit && !$state.includes(state)){
        $state.go(state, {project: $stateParams.project});
      } else {
        _this.tabInit = true;
      }
    };

    $scope.$on('$stateChangeSuccess', function(){
      _this.hideTabs = $state.includes('home');
      if($state.includes('edit')){
        _this.tabIndex = 0;
      }
      if($state.includes('scan')){
        _this.tabIndex = 1;
      }
      if($state.includes('grade')){
        _this.tabIndex = 2;
      }
      if($state.includes('options')){
        _this.tabIndex = 3;
      }
    });
  });