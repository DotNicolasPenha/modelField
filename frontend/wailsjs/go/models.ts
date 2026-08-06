export namespace main {
	
	export class APIKeys {
	    openai: string;
	    anthropic: string;
	    google: string;
	    openrouter: string;
	
	    static createFrom(source: any = {}) {
	        return new APIKeys(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.openai = source["openai"];
	        this.anthropic = source["anthropic"];
	        this.google = source["google"];
	        this.openrouter = source["openrouter"];
	    }
	}
	export class File {
	    id: string;
	    name: string;
	    content: string;
	    created: string;
	    modified: string;
	
	    static createFrom(source: any = {}) {
	        return new File(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.content = source["content"];
	        this.created = source["created"];
	        this.modified = source["modified"];
	    }
	}

}

