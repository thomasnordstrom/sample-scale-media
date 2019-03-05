<?php

namespace App\Core\Loader;

use App\Core\Kernel\Database;

use Symfony\Component\Translation\MessageCatalogue;
use Symfony\Component\Translation\Loader\LoaderInterface;

use Symfony\Component\Cache\Adapter\PhpFilesAdapter;

use Monolog\Logger;

class TranslatorDatabaseLoader implements LoaderInterface
{

    private $catArr = array();
    private $db;
    private $logger;

    public function __construct(Database $db, Logger $logger = NULL){
        $this->db = $db;
        $this->logger = $logger;
    }

    public function load($resource, $locale, $domain = 'messages')
    {

        $module_id = $resource['module_id'] ?? 0;
        $module_dirname = $resource['module_dirname'] ?? '';
        $db_src = $resource['db_src'] ?? '';

        $cache_dir = $resource['cache_dir'] ?? '';

        $cache_is_active = $cache_dir === false ? false : true;

        //domain and module dirname are required
        if(!empty($domain) && !empty($module_dirname)) {

            if($cache_is_active === true) {

                if(empty($cache_dir)){
                    $cache_is_active = false;
                }

                $cache_dir = $this->setupTranslationCacheDirectory($cache_dir, $module_dirname, $domain, $locale);
                $cache_file = $this->setupTranslationCacheFileName($module_dirname, $domain, $locale);
 
                $cache = new PhpFilesAdapter('', 0, $cache_dir);

                $cache_exists = $cache->hasItem($cache_file);

                if ($cache_exists) {

                    $translated_cache = $cache->getItem($cache_file);

                    if (!empty($translated_cache)) {
                        return $translated_cache->get();
                    }
                }
            }


            //prevents loading from db multiple times if already set
            if (!isset($this->catArr[$module_dirname])) {
                $this->catArr[$module_dirname] = array();
            }

            if (!isset($this->catArr[$module_dirname][$locale])) {
                $this->catArr[$module_dirname][$locale] = array();
            }

            $sql = 'SELECT ld.key, lddm.message, ldd.domain';

            if($db_src == 'common'){
                $tbl_language_definition = $this->db->common('locale_language_definition');
                $tbl_language_definition_message = $this->db->common('locale_language_definition_message');
                $tbl_language = $this->db->common('locale_language');
            } else {
                $tbl_language_definition = $this->db->prefix('locale_language_definition');
                $tbl_language_definition_message = $this->db->prefix('locale_language_definition_message');
                $tbl_language = $this->db->prefix('locale_language');
            }

            //some lang table always use common
            $tbl_language_definition_domain = $this->db->common('locale_language_definition_domain');
            $tbl_module = $this->db->prefix('module_installed');

            $sql .= ' FROM ' . $tbl_language_definition . ' ld';
            $sql .= ' LEFT JOIN ' . $tbl_language_definition_message . ' lddm ON ld.id = lddm.definition_id';
            $sql .= ' LEFT JOIN ' . $tbl_language_definition_domain . ' ldd ON ld.domain_id = ldd.id';
            $sql .= ' LEFT JOIN ' . $tbl_language . ' l ON lddm.language_id = l.id';
            $sql .= ' LEFT JOIN ' . $tbl_module . ' m ON ld.module_id = m.id';

            $where_stmt_str = '';
            $where_data = array();

            $where_stmt_str .= ' m.id = :whr_module_id';
            $where_data['whr_module_id'] = $module_id;

            if (!empty($domain)) {
                if (!empty($where_stmt_str)) {
                    $where_stmt_str .= ' AND';
                }
                $where_stmt_str .= ' ldd.domain = :whr_domain';
                $where_data['whr_domain'] = $domain;
            }

            if (!empty($locale)) {
                if (!empty($where_stmt_str)) {
                    $where_stmt_str .= ' AND';
                }
                $where_stmt_str .= ' l.locale = :whr_locale';
                $where_data['whr_locale'] = $locale;
            }

            $group_by_str = '';
            $order_by_str = ' ldd.domain ASC';

            $limit_str = '';
            $result = $this->db->select($sql, $where_stmt_str, $where_data, $group_by_str, $order_by_str, $limit_str);

            if (is_iterable($result)) {

                $catalogue = new MessageCatalogue($locale);

                foreach ($result as $ld) {
                    $catalogue->set($ld['key'], $ld['message'], $ld['domain']);
                }

                $this->catArr[$module_dirname][$locale] = $catalogue;

                if($cache_is_active !== false) {
                    
                    $translated_cache = $cache->getItem($cache_file);
                    $translated_cache->set($catalogue);
                    $isSaved = $cache->save($translated_cache);

                    if ($isSaved === false) {
                        $this->logger->error('Failed to save db translation catalogue cache for ' . $cache_dir . $cache_file);
                    }

                }
            }

            return $catalogue;
        }
    }

    private function setupTranslationCacheDirectory($cache_dir, $module_dirname, $domain, $locale)
    {

        $ret = '';

        $ret .= $cache_dir;

        if(!empty($module_dirname)){
            $ret .= '/' . $module_dirname;
        }
        if(!empty($locale)){
            $ret .= '/' . $locale;
        }
        if(!empty($domain)){
            $ret .= '/' . $domain;
        }

        return $ret;
    }

    private function setupTranslationCacheFileName($module_dirname, $domain, $locale, $ext = 'db')
    {
        return strtolower($module_dirname) . '.' . $domain . '.' . $locale . '.' . $ext;
    }

}
