-- CLIENTES ATIVOS COM BASE NO DIA ATUAL

ELECT  
         COUNT(DISTINCT(USUARI.CODCLI)) QTCLIATIVOS 
       FROM 
         ( SELECT 
              PCCLIENT.CODCLI 
           FROM 
             PCCLIENT, 
             PCUSUARI, PCSUPERV 
                , PCPRACA                                                		  
           WHERE 
                   PCCLIENT.CODUSUR1   = PCUSUARI.CODUSUR 
                   AND PCUSUARI.CODSUPERVISOR = PCSUPERV.CODSUPERVISOR(+)          
                   AND PCCLIENT.CODPRACA = PCPRACA.CODPRACA          
                   AND   PCCLIENT.DTULTCOMP >= TRUNC(:DtReferencia - :QTDIAS)            
                   AND (PCUSUARI.CODFILIAL IN ('1','2') OR (NVL(PCUSUARI.CODFILIAL,'99') = '99' ))
AND PCUSUARI.CODSUPERVISOR NOT IN ('9999')
AND (PCUSUARI.CODFILIAL IN ('1','2' ) OR (NVL(PCUSUARI.CODFILIAL,'99') = '99' )    )
        UNION                                                                      
                                                                                   
            SELECT                                                                  
             PCCLIENT.CODCLI                                                       
           FROM                                                                    
             PCCLIENT,                                                             
             PCUSUARI, PCSUPERV                                                    
                , PCPRACA                                                		  
           WHERE                                                                   
                  PCCLIENT.CODUSUR2 = PCUSUARI.CODUSUR                             
            AND PCUSUARI.CODSUPERVISOR = PCSUPERV.CODSUPERVISOR(+)                 
                   AND PCCLIENT.CODPRACA = PCPRACA.CODPRACA          
            AND   PCCLIENT.DTULTCOMP >= TRUNC(:DtReferencia - :QTDIAS)             
            AND (PCUSUARI.CODFILIAL IN ('1','2') OR (NVL(PCUSUARI.CODFILIAL,'99') = '99' ))
            AND PCUSUARI.CODSUPERVISOR NOT IN ('9999')
AND (PCUSUARI.CODFILIAL IN ('1','2' ) OR (NVL(PCUSUARI.CODFILIAL,'99') = '99' )    )
        UNION                                                                      
              SELECT                                                                
                 PCCLIENT.CODCLI                                                   
             FROM                                                                  
                PCUSURCLI,                                                         
                PCCLIENT,                                                          
                PCUSUARI, PCSUPERV                                                 
                , PCPRACA                                                		  
             WHERE     PCUSURCLI.CODUSUR = PCUSUARI.CODUSUR                        
                  AND PCUSUARI.CODSUPERVISOR = PCSUPERV.CODSUPERVISOR(+)           
                  AND PCCLIENT.CODPRACA = PCPRACA.CODPRACA                         
                  AND   PCUSURCLI.CODCLI  = PCCLIENT.CODCLI                        
                  AND   PCCLIENT.DTULTCOMP >= TRUNC(:DtReferencia - :QTDIAS)       
                  AND (PCUSUARI.CODFILIAL IN ('1','2') OR (NVL(PCUSUARI.CODFILIAL,'99') = '99' ))
                  AND PCUSUARI.CODSUPERVISOR NOT IN ('9999')
AND (PCUSUARI.CODFILIAL IN ('1','2' ) OR (NVL(PCUSUARI.CODFILIAL,'99') = '99' )    )
) USUARI
