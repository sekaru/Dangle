import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';
import { ApiService } from '../services/api/api.service';
import { MdDialog } from '@angular/material';
import { NewGameComponent } from '../new-game/new-game.component';
import { Router } from '@angular/router';
import { isSameWeek } from 'date-fns';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  games: any[] = [];
  events: any[] = [];
  tags: any[] = [];

  search: string = '';
  maxTags: number = 3;
  sortOptions: string[] = ['New', 'Most Players', 'Least Players']; //'Random'
  sortMode: number = 0;

  unknownImage: string = '../../assets/img/unknown.png';

  showNSFW: boolean;

  constructor(private api: ApiService, public dialog: MdDialog, private router: Router) {
    this.api.init().subscribe(data => {
      this.api.getExternal(data + "/server?id=dangleapi").subscribe(data => {
        // set the address
        this.api.address = "http://" + data;
      
        // get games
        this.api.get('games').subscribe(data => {
          this.games = data;
          
          for(let game of this.games) {
            this.api.get('events?id=' + game.id).subscribe(data => {
              game.events = data;
            });
          }
        });

        // get tags
        this.api.get('tags').subscribe(data => {
          this.tags = data;
        });
      });
    });
  }

  ngOnInit() { }

  // todo observables
  getGames(): any[] {
    for (let game of this.games) {
      game.shown = game.nsfw ? this.showNSFW ? true : false : true;
    }

    if (this.search.length > 0) {
      if (this.search.indexOf('#') != -1) {
        // search by tags (todo multiple tags)
        let searchTag = this.search.substring(1, this.search.length).toLowerCase();

        for (let i = 0; i < this.games.length; i++) {
          if (this.games[i].tags.indexOf(searchTag) == -1) this.games[i].shown = false;
        }
      } else {
        // search by name
        for (let i = 0; i < this.games.length; i++) {
          if (!this.games[i].name.includes(this.search.toLowerCase())) this.games[i].shown = false;
        }
      }
    }

    return this.sort(_.filter(this.games, { shown: true }));
  }

  sort(games: any[]): any[] {
    // new
    if(this.sortMode===0) return _.reverse(games);

    // random
    if(this.sortMode===3) return _.shuffle(games);

    let self = this;
    games = _.sortBy(games, [(game) => {return self.getEventCount(game)}]);

    // most players
    if(this.sortMode===1) return _.reverse(games);

    // least players
    return games;
  }

  getTags(game: any): string[] {
    if (!game.tags) return [];

    if (game.tags.length <= this.maxTags) {
      return game.tags;
    } else {
      let remainingTags = game.tags.length - 3;
      let displayedTags: string[] = game.tags.slice(0, 3).concat(['+' + remainingTags + ' more']);
      return displayedTags;
    }
  }

  openDialog() {
    let dialogRef = this.dialog.open(NewGameComponent, { data: {tags: this.tags} });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.game) {
        this.games.push(result.game);
      }
    });
  }

  isMoreTag(tag: string): boolean {
    return tag.indexOf(' more')!=-1;
  }

  searchByTag(tag: string, game: any) {
    if (this.isMoreTag(tag)) {
      this.clickGame(game);
      return;
    }

    this.search = '#' + tag;
  }

  clickGame(game: any) {
    this.router.navigateByUrl('/game/' + game.id, { skipLocationChange: true });
  }

  getEventCount(game: any): number {
    let count: number = 0;
    if(!game.events) return 0;
    
    for(let event of game.events) {
      if(isSameWeek(new Date(), event.start) || isSameWeek(new Date(), event.end)) count++;
    }
    return count;
  }

  getEventTooltip(game: any): string {
    let count = this.getEventCount(game);
    return (count > 1 || count === 0) ? count + ' sessions this week' : count + ' session this week';
  }

  clickSortMode(index: number) {
    this.sortMode = index;
  }

  handleBannerError(event) {
    event.target.src = this.unknownImage;
  }
}
