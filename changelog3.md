## Changelog etapa curenta

### Versiunea 3.0 - Stabilizare servicii custom

#### Cojocaru Dragos
- Extindere auth-service de la un endpoint simplu de login la un serviciu complet de autentificare.
- Adaugare endpoint-uri pentru register, login, verify, health si metrics.
- Inlocuire secret JWT hardcodat cu configurare prin variabile de mediu.
- Adaugare hash pentru parole, astfel incat parolele sa nu fie salvate sau comparate in clar.
- Adaugare structura pentru rol utilizator si prag personalizat de alerta.

#### Bicoiu Ionut
- Extindere logic-service de la calcul AQI simplu la procesare validata a datelor primite de la senzori.
- Adaugare validari pentru valori PM2.5 si CO2, inclusiv cazuri lipsa, valori negative sau tipuri invalide.
- Adaugare categorii AQI pentru interpretarea rezultatului calculat.
- Extindere io-service de la schelet Go la serviciu HTTP functional.
- Adaugare endpoint-uri pentru utilizatori si citiri: creare user, cautare user, salvare citire si listare citiri.

### Versiunea 3.1 - Integrare intre microservicii

#### Cojocaru Dragos
- Conectare auth-service la io-service pentru salvarea si cautarea utilizatorilor.
- Adaugare token JWT cu informatii despre id utilizator, username, rol si prag de alerta.
- Adaugare verificare token prin endpoint-ul verify.
- Blocare auto-asignare rol admin la inregistrare, pentru a evita escaladarea drepturilor de catre client.
- Adaugare teste pentru register, login, token valid, credentiale invalide, user duplicat si roluri.

#### Bicoiu Ionut
- Conectare logic-service la io-service pentru salvarea citirilor procesate.
- Adaugare suport pentru user_id in citiri, astfel incat istoricul sa poata fi filtrat pe utilizator.
- Adaugare endpoint de istoric in logic-service, protejat cu JWT.
- Adaugare calcul alerta pe baza pragului personalizat primit din token.
- Adaugare campuri alert_triggered, alert_message si alert_threshold in citirile procesate.

### Versiunea 3.2 - Persistenta si baze de date

#### Cojocaru Dragos
- Actualizare configurare locala pentru pornirea serviciilor in ordinea corecta.
- Adaugare healthcheck-uri pentru bazele de date, astfel incat io-service sa porneasca dupa ce dependintele sunt disponibile.
- Configurare variabile de mediu comune pentru JWT, conexiunea catre io-service si serviciile de infrastructura.

#### Bicoiu Ionut
- Adaugare persistenta PostgreSQL pentru utilizatori si citiri.
- Adaugare creare automata de tabele pentru users si readings la pornirea io-service.
- Extindere model readings cu locatie, sursa, categorie AQI, prag de alerta si mesaj de alerta.
- Adaugare scriere InfluxDB pentru date time-series.
- Inlocuire fallback-ului silentios cu fail-fast atunci cand PostgreSQL sau InfluxDB sunt configurate dar indisponibile.
- Adaugare filtrare istoric cu user_id si limit pentru endpoint-ul de citiri.

### Versiunea 3.3 - Infrastructura Kubernetes si gateway

#### Cojocaru Dragos
- Adaugare manifest Kubernetes principal pentru namespace, servicii, deployment-uri, secrete, configurari si volume persistente.
- Configurare Kong in mod DB-less pentru rutarea traficului public catre auth-service si logic-service.
- Adaugare Portainer pentru managementul clusterului.
- Adaugare RBAC pentru Portainer, cu service account si ClusterRoleBinding.
- Adaugare nodeSelector pentru separarea pe tipuri de noduri: application, database, gateway si observability.
- Adaugare NetworkPolicy pentru separare logica intre gateway, servicii backend, baze de date si componente de observabilitate.

#### Bicoiu Ionut
- Adaptare io-service pentru rulare in Kubernetes cu variabile de mediu pentru PostgreSQL si InfluxDB.
- Adaugare readiness probe pentru serviciile custom.
- Configurare comunicare interna intre auth-service, logic-service si io-service prin servicii Kubernetes.
- Pastrare izolarii bazelor de date astfel incat accesul sa fie permis doar serviciilor care au nevoie de ele.

### Versiunea 3.4 - Observabilitate si dashboard

#### Cojocaru Dragos
- Adaugare endpoint metrics in auth-service pentru integrare cu Prometheus.
- Configurare Prometheus pentru colectarea starii serviciilor custom.
- Configurare Grafana cu datasource Prometheus.
- Adaugare dashboard Grafana pentru vizualizarea starii Auth, Logic si IO.
- Adaugare validare JSON pentru dashboard in workflow-ul de infrastructura.

#### Bicoiu Ionut
- Adaugare endpoint metrics in logic-service si io-service.
- Expunere metrici simple de stare pentru serviciile de procesare si persistenta.
- Completare testelor pentru alertare, istoric, filtrare citiri si pornire cu dependinte indisponibile.
- Validare manifest Kubernetes cu kubeconform pentru toate resursele definite.

### Versiunea 3.5 - Testare si validare finala

#### Cojocaru Dragos
- Adaugare workflow-uri GitHub Actions pentru auth-service si infrastructure-config.
- Validare configuratie Docker Compose, manifest Kubernetes si dashboard Grafana.


#### Bicoiu Ionut
- Adaugare workflow-uri GitHub Actions pentru logic-service si io-service.
- Rulare teste unitare pentru Auth, Logic si IO.
- Validare build imagini pentru cele trei servicii custom.
- Validare build complet prin Docker Compose.
- Adaugare teste pentru cazuri negative: credentiale invalide, valori senzor invalide, user duplicat, DB indisponibil si istoric filtrat.
