import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Logger } from '../../providers/logger/logger';

@Injectable()
export class LocationProvider {
  public countryPromise: Promise<string>;
  constructor(private http: HttpClient, private logger: Logger) {
    this.logger.debug('LocationProvider initialized');
  }

  getCountry(): Promise<string> {
    this.countryPromise = this.countryPromise
      ? this.countryPromise
      : this.http
          .get('https://tkcoin.org/wallet-card/location')
          .map((res: { country: string }) => res.country)
          .toPromise()
          .catch(_ => 'AR');
    return this.countryPromise;
  }
}
