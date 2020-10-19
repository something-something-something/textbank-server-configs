'use strict';
const fs =require('fs');
const readline=require('readline');
const {spawnSync}=require('child_process');

const rl=readline.createInterface({
	input:process.stdin,
	output:process.stdout,
	prompt:'TextBankServerHelper>'
});


rl.prompt();

let caddyEnv=['TEXTBANK_ADDRESS']
let textbankNoneEnv=['TWILSID',
	'TWILAUTHTOKEN',
	'TWILNUMBER',
	'STMPSERVERHOST',
	'STMPSERVERPORT',
	'STMPSERVERSECURE',
	'STMPSERVERUSER',
	'STMPSERVERPASS',
	'EMAILADDRESS',
	'TEXTBANKURL',
	'ADMININVITEEMAIL',
	'COOKIESECRET'
]

rl.on('line',(inputRaw)=>{
	let input=inputRaw.trim();
	
	if(input==='create'){
		rl.question('name: ',(nameoffolder)=>{
			console.log('creating '+nameoffolder.trim());
			fs.mkdirSync('hosts/'+nameoffolder.trim());
			fs.writeFileSync('hosts/'+nameoffolder.trim()+'/caddy.env',arrayToEnvFileTemplate(caddyEnv));
			fs.writeFileSync('hosts/'+nameoffolder.trim()+'/node.env',arrayToEnvFileTemplate(textbankNoneEnv));
			fs.writeFileSync('hosts/'+nameoffolder.trim()+'/config.json',JSON.stringify({
				sshHost:''
			}));
			console.log('created '+nameoffolder.trim());
		});
	}
	else if(input==='send'){
		
			let hostdir=fs.readdirSync('hosts');

			rl.question('enter folder from host\n'+hostdir.join('\n')+'\n\n',(dirRaw)=>{
				let dir=dirRaw.trim();
				if(hostdir.includes(dir)){
					let config=JSON.parse(fs.readFileSync('hosts/'+dir+'/config.json',{encoding:'utf-8'}));
					console.log('sending files');
					console.log(config.sshHost);
					
					console.log('making directories on host');
					spawnSync('ssh',[
						config.sshHost,
						'mkdir -p /var/textbank' 
					],{stdio:'inherit'});
					console.log('setting directory permissions');
					spawnSync('ssh',[
						config.sshHost,
						'chmod o-r-w /var/textbank' 
					],{stdio:'inherit'});

					console.log('sending service files');

					spawnSync('rsync',[
						'systemd-units/textbank-caddy.service',
						config.sshHost+':/etc/systemd/system/textbank-caddy.service'
					],{stdio:'inherit'});
					spawnSync('rsync',[
						'systemd-units/textbank-node.service',
						config.sshHost+':/etc/systemd/system/textbank-node.service'
					],{stdio:'inherit'});
					spawnSync('rsync',[
						'systemd-units/textbank-mongo.service',
						config.sshHost+':/etc/systemd/system/textbank-mongo.service'
					],{stdio:'inherit'});

					console.log('sending configs');

					spawnSync('rsync',[
						'configs/Caddyfile',
						config.sshHost+':/var/textbank/Caddyfile'
					],{stdio:'inherit'});

					console.log('sending env files');

					spawnSync('rsync',[
						'--chmod=600',
						'hosts/'+dir+'/caddy.env',
						config.sshHost+':/var/textbank/textbank-caddy.env'
					],{stdio:'inherit'});
					spawnSync('rsync',[
						'--chmod=600',
						'hosts/'+dir+'/node.env',
						config.sshHost+':/var/textbank/textbank-node.env'
					],{stdio:'inherit'});

					console.log('BE SURE TO ENABLE OR RESTART SERVICES!')

				}
				else{
					console.log('Does not exist aborting');
				}
			})
	}
	else if(input==='delete'){
		let hostdir=fs.readdirSync('hosts');
		rl.question('enter folder from host It will be deleted! \n'+hostdir.join('\n')+'\n\n',(dirRaw)=>{
			let dir=dirRaw.trim();
			if(hostdir.includes(dir)){
				rl.question('type DELETE to confirm',(confirm)=>{
					if(confirm.trim()==='DELETE'){
						fs.rmSync('hosts/'+dir,{recursive:true});
						console.log('deleted')
					}
					else{
						console.log('delete not happening')
					}
				})
			}
		});
	}
	else if(input==='exit'){
		rl.close();
	}
	else if(input==='help'){
		console.log('COMMANDS:');
		console.log('create :');
		console.log('send :');
		console.log('delete :');
		console.log('help :');
		console.log('exit :');
	}
	else{
		console.log('NOT RECOGNIZED: '+input);
		console.log('Try typing help');
	}
});
function arrayToEnvFileTemplate(arr){
	return arr.map((el)=>{
		return el+'=';
	}).join('\n');
}


