import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AlertService,
  CloudAppEventsService,
  CloudAppRestService,
  Entity,
  HttpMethod,
  RestErrorResponse
} from '@exlibris/exl-cloudapp-angular-lib';
import { Observable, concatMap, from, of, catchError, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  private awsURL: string = "https://nga1cj08ih.execute-api.us-east-2.amazonaws.com/marva/api-production/ldp/"
  private bibframeHost: string = "bibframe.org"

  loading = false;
  selectedEntity: Entity | null = null;
  apiResult: any;
  authToken: string = ""
  marvaID: string = ""
  bibframeRecord: string =  ""

  constructor(
    private restService: CloudAppRestService,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.eventsService.getAuthToken().subscribe({
      next: (authToken) => {        
        this.authToken = authToken; 
        console.log(authToken)         
      }
    })
  }

  loadFromMarva() {
    this.loading = true
    this.getBibframeRecord(this.marvaID).subscribe({
      next: (resp: string) => {
        this.bibframeRecord = resp
        this.loading = false
      },
      error: (err: RestErrorResponse) => {
        this.bibframeRecord = err.message
        this.loading = false
      }
    });      
  }

  getBibframeRecord(id: string): Observable<string> {
    return this.http.get(this.awsURL + id, 
      {
        headers: new HttpHeaders({
          'X-Proxy-Host': this.bibframeHost,
          'Authorization': 'Bearer ' + this.authToken,
          'Accept': 'application/rdf+xml'
        }),
        responseType: 'text'
      })
  }

  clear(): void {
    this.bibframeRecord = ""
  }

  getRecords(recType: string): string[] {
    let parser = new DOMParser()
    let xmlDOM: XMLDocument = parser.parseFromString(this.bibframeRecord,'application/xml')
    let records: string[] = []

    let attributes = xmlDOM.firstElementChild?.attributes
    let namespaces = ""
    if(attributes) {
      for(var i = 0; i < attributes.length; i++) {
        namespaces += " " + attributes[i].name + '="' + attributes[i].value + '"'
      }
    }

    let recordType: string = "bf:" + recType.substring(0,1).toUpperCase() + recType.substring(1)
    let elements : HTMLCollection = xmlDOM.documentElement.children

    for(var i = 0; i < elements.length; i++) {
      if(elements[i].tagName == recordType) {
        let fullrecord = `<bib>
          <record_format>lcbf_${recType}</record_format>
          <suppress_from_publishing>false</suppress_from_publishing>
          <record><rdf:RDF${namespaces}>${elements[i].outerHTML}</rdf:RDF></record></bib>`
        records.push(fullrecord)
      }
    }

    return records
  }

  createRecord(record: string): Observable<string> {
    return this.restService.call( {
      url: `/bibs/`,      
      headers: { 
        "Content-Type": "application/xml",
        "Accept": "application/json" 
      },
      queryParams: {
        "from_nz_mms_id": "",
        "from_cz_mms_id": "",
        "normalization": "",
        "validate": false,
        "override_warning": true,
        "check_match": false,
        "import_profile": ""
      },
      requestBody: record,
      method: HttpMethod.POST
    }).pipe(
      catchError((error, caught) => {
        if(error.status == "400" && error.message.match(/records exist/)) {
          let mms_id = this.extractMMSID(error.message)
          return this.updateRecord(mms_id,record)
        } else {
          throw error
        }        
      })
    )
  }

  updateRecord(mms_id: string, record: string): Observable<string> {
    return this.restService.call( {
      url: `/bibs/` + mms_id,      
      headers: { 
        "Content-Type": "application/xml",
        "Accept": "application/xml" 
      },
      queryParams: {
        "normalization": "",
        "validate": false,
        "override_warning": true,
        "override_lock": false,
        "stale_version_check": false,
        "check_match": false,
        "import_profile": ""
      },
      requestBody: record,
      method: HttpMethod.PUT
    })
  }

  extractMMSID(message: string): string {
    message = JSON.stringify(message)
    if(JSON.parse(message).mms_id)
      return JSON.parse(message).mms_id
    else {
      var m = message.match(/(?:<mms_id>|\[)([0-9]+)(?:<\/mms_id>|\])/)
      return m?.at(1) || ""
    }
  }

  saveToAlma(): void {
    let work = this.getRecords('work')[0]
    let instances = this.getRecords('instance')

    let records: string[] = [work,...instances]

    this.alert.clear()
    this.loading = true

    from(records).pipe(
      concatMap((record: string) => this.createRecord(record))
    ).subscribe({
        next: (res: string) => {
          let recType = "work"
          if(JSON.stringify(res).match("lcbf_instance")) {
            recType = "instance"  
          }
          
          let operation = "Created"
          if(JSON.stringify(res).match("<mms_id>")) {
            operation = "Updated"
          }

          this.alert.success(
            operation + " " + recType + " record with MMS ID " + this.extractMMSID(res),
              {autoClose: false}
          )
        },
        error: (err: RestErrorResponse) => {
          this.alert.error(err.message)
          this.loading = false
        },
        complete: () => {
          this.loading = false          
        }
    })
  }

  ngOnDestroy(): void {
  }
}